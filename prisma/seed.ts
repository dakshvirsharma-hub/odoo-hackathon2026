import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting StockSense database seed...");

  // Clear existing records in reverse dependency order
  await prisma.stockMoveLedger.deleteMany({});
  await prisma.stockOperationLine.deleteMany({});
  await prisma.stockOperation.deleteMany({});
  await prisma.stockLevel.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Seed Demo Users
  const passwordHash = await bcrypt.hash("OdooHack2026!", 10);
  const managerUser = await prisma.user.create({
    data: {
      loginId: "dakshvir",
      email: "dakshvirsharma2008@gmail.com",
      passwordHash,
      name: "Dakshvir Sharma",
      role: "MANAGER",
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      loginId: "staff_alex",
      email: "alex@stocksense.internal",
      passwordHash,
      name: "Alex Warehouse Lead",
      role: "STAFF",
    },
  });

  console.log(`👤 Seeded 2 users: ${managerUser.name}, ${staffUser.name}`);

  // 2. Seed Warehouses
  const mainWH = await prisma.warehouse.create({
    data: {
      name: "Main Warehouse",
      shortCode: "WH",
      address: "Plot 42, Industrial Corridor, Jalandhar, Punjab",
    },
  });

  const secondaryWH = await prisma.warehouse.create({
    data: {
      name: "Logistics Hub 2",
      shortCode: "WH2",
      address: "Sector 18, Phase II Logistics Park, Jalandhar",
    },
  });

  console.log("🏭 Seeded 2 Warehouses");

  // 3. Seed Locations (Internal, Vendors, Customers, Virtual)
  const locStock1 = await prisma.location.create({
    data: {
      name: "Stock1",
      shortCode: "WH/Stock1",
      type: "INTERNAL",
      warehouseId: mainWH.id,
    },
  });

  const locStock2 = await prisma.location.create({
    data: {
      name: "Stock2",
      shortCode: "WH/Stock2",
      type: "INTERNAL",
      warehouseId: mainWH.id,
    },
  });

  const locProduction = await prisma.location.create({
    data: {
      name: "Production Floor",
      shortCode: "WH/Production",
      type: "INTERNAL",
      warehouseId: mainWH.id,
    },
  });

  const locVendors = await prisma.location.create({
    data: {
      name: "Vendors / Incoming",
      shortCode: "Partner/Vendors",
      type: "VENDOR",
    },
  });

  const locCustomers = await prisma.location.create({
    data: {
      name: "Customers / Outgoing",
      shortCode: "Partner/Customers",
      type: "CUSTOMER",
    },
  });

  const locScrap = await prisma.location.create({
    data: {
      name: "Virtual Loss & Scrap",
      shortCode: "Virtual/Scrap",
      type: "INVENTORY_LOSS",
    },
  });

  console.log("📍 Seeded 6 locations (Physical + Virtual)");

  // 4. Seed 14 Realistic Products matching wireframes
  const productData = [
    { name: "Executive Desk", sku: "DESK001", category: "Furniture", uom: "Units", perUnitCost: 3000, minStock: 15, onHand: 50, reserved: 5 },
    { name: "Conference Table", sku: "TAB001", category: "Furniture", uom: "Units", perUnitCost: 3000, minStock: 10, onHand: 50, reserved: 0 },
    { name: "Ergonomic Office Chair", sku: "CHR001", category: "Furniture", uom: "Units", perUnitCost: 4500, minStock: 20, onHand: 35, reserved: 5 },
    { name: "Industrial Steel Rods", sku: "STL001", category: "Raw Materials", uom: "kg", perUnitCost: 450, minStock: 50, onHand: 150, reserved: 50 },
    { name: "Heavy Steel Frames", sku: "STL002", category: "Components", uom: "Units", perUnitCost: 1200, minStock: 15, onHand: 25, reserved: 5 },
    { name: "Oak Wood Planks (2m)", sku: "WDN001", category: "Raw Materials", uom: "Units", perUnitCost: 650, minStock: 30, onHand: 80, reserved: 0 },
    { name: "M6 Hex Screws & Fasteners", sku: "SCR001", category: "Hardware", uom: "Boxes", perUnitCost: 15, minStock: 200, onHand: 1200, reserved: 0 },
    { name: "Aluminum Extrusion Rails", sku: "ALU001", category: "Raw Materials", uom: "Meters", perUnitCost: 850, minStock: 25, onHand: 60, reserved: 0 },
    { name: "LED Task Lamp 12W", sku: "LED001", category: "Electronics", uom: "Units", perUnitCost: 1500, minStock: 15, onHand: 40, reserved: 2 },
    { name: "Double Door Steel Cabinet", sku: "CBN001", category: "Furniture", uom: "Units", perUnitCost: 6200, minStock: 5, onHand: 12, reserved: 0 },
    { name: "Stackable Industrial Bins", sku: "BIN001", category: "Packaging", uom: "Units", perUnitCost: 320, minStock: 40, onHand: 200, reserved: 10 },
    { name: "Heavy Duty Cable Reel (100m)", sku: "WIR001", category: "Electronics", uom: "Rolls", perUnitCost: 950, minStock: 8, onHand: 30, reserved: 0 },
    { name: "Tempered Glass Top 120cm", sku: "GLS001", category: "Components", uom: "Units", perUnitCost: 2200, minStock: 10, onHand: 8, reserved: 3 }, // Low stock!
    { name: "Double Wall Corrugated Box", sku: "PKG001", category: "Packaging", uom: "Units", perUnitCost: 45, minStock: 100, onHand: 500, reserved: 50 },
  ];

  const products: Record<string, any> = {};

  for (const item of productData) {
    const product = await prisma.product.create({
      data: {
        name: item.name,
        sku: item.sku,
        category: item.category,
        uom: item.uom,
        perUnitCost: item.perUnitCost,
        minStock: item.minStock,
      },
    });

    // Populate stock level at WH/Stock1
    await prisma.stockLevel.create({
      data: {
        productId: product.id,
        locationId: locStock1.id,
        onHand: item.onHand,
        reserved: item.reserved,
      },
    });

    products[item.sku] = product;
  }

  console.log(`📦 Seeded ${productData.length} realistic products & stock levels`);

  // 5. Seed Core Operations matching wireframe specifications
  // Operation 1: WH/IN/0001 (Incoming Receipt, Ready)
  const opIn1 = await prisma.stockOperation.create({
    data: {
      reference: "WH/IN/0001",
      type: "RECEIPT",
      status: "READY",
      contact: "Azure Interior",
      scheduleDate: new Date(),
      responsibleName: managerUser.name,
      sourceLocationId: locVendors.id,
      destLocationId: locStock1.id,
      notes: "Urgent vendor batch for showroom refurbishing",
    },
  });

  await prisma.stockOperationLine.create({
    data: {
      operationId: opIn1.id,
      productId: products["DESK001"].id,
      qtyDemanded: 6,
      qtyDone: 6,
    },
  });

  await prisma.stockOperationLine.create({
    data: {
      operationId: opIn1.id,
      productId: products["STL001"].id,
      qtyDemanded: 50,
      qtyDone: 50,
    },
  });

  // Operation 2: WH/IN/0002 (Completed Receipt)
  const opIn2 = await prisma.stockOperation.create({
    data: {
      reference: "WH/IN/0002",
      type: "RECEIPT",
      status: "DONE",
      contact: "Gemini Industrial Supplies",
      scheduleDate: new Date(Date.now() - 86400000 * 2), // 2 days ago
      responsibleName: staffUser.name,
      sourceLocationId: locVendors.id,
      destLocationId: locStock1.id,
      notes: "Regular hardware replenishment",
    },
  });

  await prisma.stockOperationLine.create({
    data: {
      operationId: opIn2.id,
      productId: products["SCR001"].id,
      qtyDemanded: 500,
      qtyDone: 500,
    },
  });

  // Operation 3: WH/IN/0003 (Draft Receipt)
  const opIn3 = await prisma.stockOperation.create({
    data: {
      reference: "WH/IN/0003",
      type: "RECEIPT",
      status: "DRAFT",
      contact: "Deco Addict",
      scheduleDate: new Date(Date.now() + 86400000 * 3), // 3 days in future
      responsibleName: managerUser.name,
      sourceLocationId: locVendors.id,
      destLocationId: locStock1.id,
      notes: "Quarterly chair contract",
    },
  });

  await prisma.stockOperationLine.create({
    data: {
      operationId: opIn3.id,
      productId: products["CHR001"].id,
      qtyDemanded: 10,
      qtyDone: 0,
    },
  });

  // Operation 4: WH/OUT/0001 (Delivery Order, Ready)
  const opOut1 = await prisma.stockOperation.create({
    data: {
      reference: "WH/OUT/0001",
      type: "DELIVERY",
      status: "READY",
      contact: "Azure Interior",
      scheduleDate: new Date(),
      responsibleName: managerUser.name,
      sourceLocationId: locStock1.id,
      destLocationId: locCustomers.id,
      notes: "Client order #SO-2026-99",
    },
  });

  await prisma.stockOperationLine.create({
    data: {
      operationId: opOut1.id,
      productId: products["TAB001"].id,
      qtyDemanded: 10,
      qtyDone: 10,
      isOutOfStock: false,
    },
  });

  // Operation 5: WH/OUT/0002 (Delivery Order, Waiting - Out of stock trigger!)
  const opOut2 = await prisma.stockOperation.create({
    data: {
      reference: "WH/OUT/0002",
      type: "DELIVERY",
      status: "WAITING",
      contact: "Lumber & Modern Design",
      scheduleDate: new Date(Date.now() - 86400000), // Yesterday = Late!
      responsibleName: staffUser.name,
      sourceLocationId: locStock1.id,
      destLocationId: locCustomers.id,
      notes: "Glass top shortage - waiting for supplier delivery",
    },
  });

  await prisma.stockOperationLine.create({
    data: {
      operationId: opOut2.id,
      productId: products["GLS001"].id,
      qtyDemanded: 15, // demanding 15 but onHand is only 8
      qtyDone: 0,
      isOutOfStock: true, // Marked red in UI as per wireframe spec
    },
  });

  // 6. Seed Move History Ledger (Immutable log matching wireframe spec)
  const ledgerEntries = [
    {
      reference: "WH/IN/0001",
      operationId: opIn1.id,
      productId: products["DESK001"].id,
      fromLocationId: locVendors.id,
      toLocationId: locStock1.id,
      contact: "Azure Interior",
      quantity: 6,
      moveType: "IN",
      status: "READY",
      date: new Date(),
      notes: "Vendor Receipt Line 1",
    },
    {
      reference: "WH/IN/0001",
      operationId: opIn1.id,
      productId: products["STL001"].id,
      fromLocationId: locVendors.id,
      toLocationId: locStock1.id,
      contact: "Azure Interior",
      quantity: 50,
      moveType: "IN",
      status: "READY",
      date: new Date(),
      notes: "Vendor Receipt Line 2",
    },
    {
      reference: "WH/IN/0002",
      operationId: opIn2.id,
      productId: products["SCR001"].id,
      fromLocationId: locVendors.id,
      toLocationId: locStock1.id,
      contact: "Gemini Industrial Supplies",
      quantity: 500,
      moveType: "IN",
      status: "DONE",
      date: new Date(Date.now() - 86400000 * 2),
      notes: "Received and placed in bin",
    },
    {
      reference: "WH/OUT/0001",
      operationId: opOut1.id,
      productId: products["TAB001"].id,
      fromLocationId: locStock1.id,
      toLocationId: locCustomers.id,
      contact: "Azure Interior",
      quantity: 10,
      moveType: "OUT",
      status: "READY",
      date: new Date(),
      notes: "Packed and awaiting pickup",
    },
    {
      reference: "WH/INT/0001",
      operationId: null,
      productId: products["STL001"].id,
      fromLocationId: locStock1.id,
      toLocationId: locProduction.id,
      contact: "Production Line A",
      quantity: 20,
      moveType: "INTERNAL",
      status: "DONE",
      date: new Date(Date.now() - 86400000 * 4),
      notes: "Transfer to production rack",
    },
    {
      reference: "WH/ADJ/0001",
      operationId: null,
      productId: products["STL001"].id,
      fromLocationId: locStock1.id,
      toLocationId: locScrap.id,
      contact: "Warehouse Inspection",
      quantity: 3,
      moveType: "ADJUSTMENT",
      status: "DONE",
      date: new Date(Date.now() - 86400000 * 5),
      notes: "3 kg damaged raw stock written off to scrap",
    },
  ];

  for (const move of ledgerEntries) {
    await prisma.stockMoveLedger.create({ data: move });
  }

  console.log(`📜 Seeded ${ledgerEntries.length} Move History audit ledger records`);
  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
