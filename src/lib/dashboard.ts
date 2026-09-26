import prisma from "@/lib/prisma";

export async function getDashboardData() {
  const today = new Date();

  // 1. Fetch products with their stock levels to compute inventory values and low stock alerts
  const products = await prisma.product.findMany({
    include: {
      stockLevels: true,
    },
  });

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalInventoryValue = 0;

  for (const p of products) {
    const onHand = (p.stockLevels || []).reduce((acc: number, sl: { onHand: number }) => acc + (sl.onHand || 0), 0);
    const reserved = (p.stockLevels || []).reduce((acc: number, sl: { reserved: number }) => acc + (sl.reserved || 0), 0);
    const freeToUse = Math.max(0, onHand - reserved);

    if (freeToUse <= 0) {
      outOfStockCount++;
    } else if (freeToUse <= p.minStock) {
      lowStockCount++;
    }

    totalInventoryValue += onHand * p.perUnitCost;
  }

  // 2. Fetch operation counts
  const [
    pendingReceipts,
    pendingDeliveries,
    scheduledTransfers,
    allOperations,
    recentMoves,
  ] = await Promise.all([
    prisma.stockOperation.count({
      where: {
        type: "RECEIPT",
        status: { in: ["DRAFT", "READY"] },
      },
    }),
    prisma.stockOperation.count({
      where: {
        type: "DELIVERY",
        status: { in: ["READY", "WAITING"] },
      },
    }),
    prisma.stockOperation.count({
      where: {
        type: "INTERNAL",
        status: { in: ["DRAFT", "READY"] },
      },
    }),
    prisma.stockOperation.findMany({
      where: {
        status: { notIn: ["DONE", "CANCELED"] },
      },
      select: {
        id: true,
        type: true,
        status: true,
        scheduleDate: true,
      },
    }),
    prisma.stockMoveLedger.findMany({
      take: 6,
      orderBy: { date: "desc" },
      include: {
        product: {
          select: { name: true, sku: true, uom: true },
        },
        fromLocation: {
          select: { name: true, shortCode: true },
        },
        toLocation: {
          select: { name: true, shortCode: true },
        },
      },
    }),
  ]);

  let receiptLate = 0;
  let receiptToReceive = 0;
  let receiptTotal = 0;

  let deliveryLate = 0;
  let deliveryWaiting = 0;
  let deliveryToDeliver = 0;
  let deliveryTotal = 0;

  for (const op of allOperations) {
    const isLate = new Date(op.scheduleDate) < today;

    if (op.type === "RECEIPT") {
      receiptTotal++;
      if (op.status === "READY" || op.status === "DRAFT") receiptToReceive++;
      if (isLate) receiptLate++;
    } else if (op.type === "DELIVERY") {
      deliveryTotal++;
      if (op.status === "WAITING") deliveryWaiting++;
      if (op.status === "READY" || op.status === "WAITING") deliveryToDeliver++;
      if (isLate) deliveryLate++;
    }
  }

  return {
    kpis: {
      totalProducts: products.length,
      lowStockCount,
      outOfStockCount,
      pendingReceipts,
      pendingDeliveries,
      scheduledTransfers,
      totalInventoryValue,
    },
    cards: {
      receipt: {
        late: receiptLate,
        totalOperations: receiptTotal,
        toReceive: receiptToReceive,
      },
      delivery: {
        late: deliveryLate,
        waiting: deliveryWaiting,
        totalOperations: deliveryTotal,
        toDeliver: deliveryToDeliver,
      },
    },
    recentMoves: recentMoves.map((m) => ({
      ...m,
      date: m.date.toISOString(),
    })),
  };
}
