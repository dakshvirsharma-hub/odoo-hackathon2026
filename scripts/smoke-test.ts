import { prisma } from "../src/lib/prisma";
import { generateOperationReference, validateStockOperation } from "../src/lib/stock-engine";

async function runSmokeTests() {
  console.log("\n==================================================");
  console.log("🧪 StockSense IMS Core Smoke Test Suite");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Database Connectivity & Seed Verification
  try {
    process.stdout.write("Test 1: Verifying DB connection & realistic product seed... ");
    const productCount = await prisma.product.count();
    const locationCount = await prisma.location.count();
    const warehouseCount = await prisma.warehouse.count();

    if (productCount >= 10 && locationCount >= 4 && warehouseCount >= 1) {
      console.log(`\x1b[32m✔ PASS\x1b[0m (${productCount} products, ${locationCount} locations)`);
      passed++;
    } else {
      throw new Error(`Insufficient seed data: ${productCount} products, ${locationCount} locations`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`\x1b[31m✘ FAIL\x1b[0m: ${msg}`);
    failed++;
  }

  // Test 2: Sequential Reference Generator
  try {
    process.stdout.write("Test 2: Verifying sequential reference generation (WH/IN/xxxx)... ");
    const ref = await generateOperationReference("WH", "RECEIPT");
    if (ref.startsWith("WH/IN/") && /^WH\/IN\/\d{4}$/.test(ref)) {
      console.log(`\x1b[32m✔ PASS\x1b[0m (Generated: ${ref})`);
      passed++;
    } else {
      throw new Error(`Invalid reference format: ${ref}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`\x1b[31m✘ FAIL\x1b[0m: ${msg}`);
    failed++;
  }

  // Test 3: Double-Entry Stock Movement & Ledger Validation
  try {
    process.stdout.write("Test 3: Verifying atomic receipt validation & double-entry ledger... ");

    // Pick first product and internal location
    const product = await prisma.product.findFirst({
      include: { stockLevels: true },
    });
    const destLoc = await prisma.location.findFirst({
      where: { type: "INTERNAL" },
    });
    const vendorLoc = await prisma.location.findFirst({
      where: { type: "VENDOR" },
    });

    if (!product || !destLoc || !vendorLoc) {
      throw new Error("Missing required test entities in database");
    }

    const testRef = `WH/IN/SMOKE-${Date.now().toString().slice(-4)}`;
    const testQty = 5;

    // Create test operation
    const op = await prisma.stockOperation.create({
      data: {
        reference: testRef,
        type: "RECEIPT",
        status: "READY",
        contact: "Smoke Test Vendor Ltd",
        sourceLocationId: vendorLoc.id,
        destLocationId: destLoc.id,
        notes: "Automated smoke test receipt",
        lines: {
          create: [
            {
              productId: product.id,
              qtyDemanded: testQty,
              qtyDone: 0,
            },
          ],
        },
      },
    });

    // Capture stock before validation
    const beforeStock = await prisma.stockLevel.findUnique({
      where: {
        productId_locationId: {
          productId: product.id,
          locationId: destLoc.id,
        },
      },
    });
    const initialOnHand = beforeStock?.onHand || 0;

    // Execute atomic validation
    await validateStockOperation(op.id);

    // Verify stock increment
    const afterStock = await prisma.stockLevel.findUnique({
      where: {
        productId_locationId: {
          productId: product.id,
          locationId: destLoc.id,
        },
      },
    });

    const expectedOnHand = initialOnHand + testQty;
    if (afterStock?.onHand !== expectedOnHand) {
      throw new Error(`Stock mismatch: Expected ${expectedOnHand}, got ${afterStock?.onHand}`);
    }

    // Verify immutable ledger record
    const ledgerEntry = await prisma.stockMoveLedger.findFirst({
      where: { reference: testRef },
    });

    if (!ledgerEntry || ledgerEntry.quantity !== testQty || ledgerEntry.moveType !== "IN") {
      throw new Error("Missing or invalid immutable move ledger entry");
    }

    console.log(`\x1b[32m✔ PASS\x1b[0m (Stock +${testQty} verified, Ledger logged)`);
    passed++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`\x1b[31m✘ FAIL\x1b[0m: ${msg}`);
    failed++;
  }

  // Test 4: Out-of-Stock Guard & Free-to-Use Calculation
  try {
    process.stdout.write("Test 4: Verifying delivery shortage guard & waiting state... ");

    const product = await prisma.product.findFirst({
      include: { stockLevels: true },
    });
    const internalLoc = await prisma.location.findFirst({
      where: { type: "INTERNAL" },
    });
    const customerLoc = await prisma.location.findFirst({
      where: { type: "CUSTOMER" },
    });

    if (!product || !internalLoc || !customerLoc) {
      throw new Error("Missing test entities");
    }

    // Attempt delivery with an impossible quantity (e.g. 999,999 units)
    const impossibleQty = 999999;
    const testRef = `WH/OUT/SHORT-${Date.now().toString().slice(-4)}`;

    const op = await prisma.stockOperation.create({
      data: {
        reference: testRef,
        type: "DELIVERY",
        status: "READY",
        contact: "Shortage Test Buyer",
        sourceLocationId: internalLoc.id,
        destLocationId: customerLoc.id,
        lines: {
          create: [
            {
              productId: product.id,
              qtyDemanded: impossibleQty,
              qtyDone: 0,
            },
          ],
        },
      },
    });

    let prevented = false;
    try {
      await validateStockOperation(op.id);
    } catch {
      prevented = true;
    }

    // Verify operation transitioned to WAITING and line flagged
    const updatedOp = await prisma.stockOperation.findUnique({
      where: { id: op.id },
      include: { lines: true },
    });

    if (prevented && updatedOp?.status === "WAITING" && updatedOp.lines[0]?.isOutOfStock) {
      console.log(`\x1b[32m✔ PASS\x1b[0m (Shortage detected, blocked, status set to WAITING)`);
      passed++;
    } else {
      throw new Error("Failed to block delivery with insufficient inventory");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`\x1b[31m✘ FAIL\x1b[0m: ${msg}`);
    failed++;
  }

  console.log("\n--------------------------------------------------");
  console.log(`Test Summary: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
  console.log("--------------------------------------------------\n");

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests().catch((e: unknown) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
