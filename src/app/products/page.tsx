import React from "react";
import prisma from "@/lib/prisma";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      stockLevels: {
        include: {
          location: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const formattedProducts = products.map((p) => {
    const stockList = p.stockLevels || [];
    const totalOnHand = stockList.reduce((sum: number, sl: { onHand: number }) => sum + (sl.onHand || 0), 0);
    const totalReserved = stockList.reduce((sum: number, sl: { reserved: number }) => sum + (sl.reserved || 0), 0);
    const freeToUse = Math.max(0, totalOnHand - totalReserved);
    const isLowStock = freeToUse <= p.minStock;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      uom: p.uom,
      perUnitCost: p.perUnitCost,
      minStock: p.minStock,
      onHand: totalOnHand,
      reserved: totalReserved,
      freeToUse,
      isLowStock,
      stockLevels: stockList.map((sl) => ({
        locationId: sl.locationId,
        locationName: sl.location?.name || "Internal Stock",
        locationCode: sl.location?.shortCode || "STOCK",
        onHand: sl.onHand || 0,
        reserved: sl.reserved || 0,
        freeToUse: Math.max(0, (sl.onHand || 0) - (sl.reserved || 0)),
      })),
    };
  });

  return <ProductsClient initialProducts={formattedProducts} />;
}
