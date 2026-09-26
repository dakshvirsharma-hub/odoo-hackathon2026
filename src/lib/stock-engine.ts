import { prisma } from "./prisma";

/**
 * Generate sequential human-readable reference: WH/IN/0001, WH/OUT/0001, etc.
 * Wireframe rule: Format <Warehouse>/<Operation>/<ID>
 */
export async function generateOperationReference(
  warehouseCode: string,
  type: "RECEIPT" | "DELIVERY" | "INTERNAL" | "ADJUSTMENT"
): Promise<string> {
  const typeCodeMap: Record<string, string> = {
    RECEIPT: "IN",
    DELIVERY: "OUT",
    INTERNAL: "INT",
    ADJUSTMENT: "ADJ",
  };
  const code = typeCodeMap[type] || "GEN";
  const prefix = `${warehouseCode}/${code}/`;

  // Count existing operations of this type
  const count = await prisma.stockOperation.count({
    where: {
      reference: {
        startsWith: prefix,
      },
    },
  });

  const nextNumber = (count + 1).toString().padStart(4, "0");
  return `${prefix}${nextNumber}`;
}

/**
 * Validates and executes a Stock Operation according to Odoo double-entry inventory rules.
 * Updates cached StockLevel and appends to StockMoveLedger audit trail.
 */
export async function validateStockOperation(operationId: string) {
  return await prisma.$transaction(async (tx) => {
    const op = await tx.stockOperation.findUnique({
      where: { id: operationId },
      include: {
        lines: {
          include: { product: true },
        },
      },
    });

    if (!op) {
      throw new Error("Stock operation not found");
    }

    if (op.status === "DONE") {
      throw new Error("Operation has already been validated and marked as DONE");
    }

    // Default locations if not explicitly attached
    let srcLocId = op.sourceLocationId;
    let dstLocId = op.destLocationId;

    if (!srcLocId || !dstLocId) {
      const defaultInternal = await tx.location.findFirst({ where: { type: "INTERNAL" } });
      const defaultVendor = await tx.location.findFirst({ where: { type: "VENDOR" } });
      const defaultCustomer = await tx.location.findFirst({ where: { type: "CUSTOMER" } });
      const defaultLoss = await tx.location.findFirst({ where: { type: "INVENTORY_LOSS" } });

      if (op.type === "RECEIPT") {
        srcLocId = srcLocId || defaultVendor?.id || "";
        dstLocId = dstLocId || defaultInternal?.id || "";
      } else if (op.type === "DELIVERY") {
        srcLocId = srcLocId || defaultInternal?.id || "";
        dstLocId = dstLocId || defaultCustomer?.id || "";
      } else if (op.type === "ADJUSTMENT") {
        srcLocId = srcLocId || defaultInternal?.id || "";
        dstLocId = dstLocId || defaultLoss?.id || "";
      } else {
        srcLocId = srcLocId || defaultInternal?.id || "";
        dstLocId = dstLocId || defaultInternal?.id || "";
      }
    }

    // Process each line item
    for (const line of op.lines) {
      const qty = line.qtyDemanded;

      // 1. If Receipt: Add stock to destination location
      if (op.type === "RECEIPT") {
        await tx.stockLevel.upsert({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: dstLocId,
            },
          },
          update: {
            onHand: { increment: qty },
          },
          create: {
            productId: line.productId,
            locationId: dstLocId,
            onHand: qty,
            reserved: 0,
          },
        });
      }

      // 2. If Delivery: Check availability & deduct from source location
      if (op.type === "DELIVERY") {
        const sourceStock = await tx.stockLevel.findUnique({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: srcLocId,
            },
          },
        });

        const available = (sourceStock?.onHand || 0) - (sourceStock?.reserved || 0);
        if (available < qty) {
          // Wireframe spec: mark line out of stock and set operation to WAITING
          await tx.stockOperationLine.update({
            where: { id: line.id },
            data: { isOutOfStock: true },
          });
          await tx.stockOperation.update({
            where: { id: op.id },
            data: { status: "WAITING" },
          });
          throw new Error(
            `Insufficient stock for "${line.product.name}" (${line.product.sku}). Available: ${available}, Demanded: ${qty}`
          );
        }

        await tx.stockLevel.update({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: srcLocId,
            },
          },
          data: {
            onHand: { decrement: qty },
          },
        });
      }

      // 3. If Internal Move: Deduct from source and add to destination
      if (op.type === "INTERNAL") {
        await tx.stockLevel.update({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: srcLocId,
            },
          },
          data: {
            onHand: { decrement: qty },
          },
        });

        await tx.stockLevel.upsert({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: dstLocId,
            },
          },
          update: {
            onHand: { increment: qty },
          },
          create: {
            productId: line.productId,
            locationId: dstLocId,
            onHand: qty,
            reserved: 0,
          },
        });
      }

      // 4. Mark line as done
      await tx.stockOperationLine.update({
        where: { id: line.id },
        data: { qtyDone: qty, isOutOfStock: false },
      });

      // 5. Append to StockMoveLedger (Wireframe rule: In moves = IN, Out moves = OUT)
      const moveType =
        op.type === "RECEIPT"
          ? "IN"
          : op.type === "DELIVERY"
          ? "OUT"
          : op.type === "INTERNAL"
          ? "INTERNAL"
          : "ADJUSTMENT";

      await tx.stockMoveLedger.create({
        data: {
          reference: op.reference,
          operationId: op.id,
          productId: line.productId,
          fromLocationId: srcLocId,
          toLocationId: dstLocId,
          contact: op.contact,
          quantity: qty,
          moveType,
          status: "DONE",
          date: new Date(),
          notes: op.notes || `Validated ${op.type} operation`,
        },
      });
    }

    // 6. Update operation status to DONE
    const updatedOp = await tx.stockOperation.update({
      where: { id: op.id },
      data: {
        status: "DONE",
      },
      include: {
        lines: { include: { product: true } },
      },
    });

    return updatedOp;
  });
}
