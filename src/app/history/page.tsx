import React from "react";
import prisma from "@/lib/prisma";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const moves = await prisma.stockMoveLedger.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          uom: true,
          category: true,
        },
      },
      fromLocation: {
        select: {
          id: true,
          name: true,
          shortCode: true,
        },
      },
      toLocation: {
        select: {
          id: true,
          name: true,
          shortCode: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  const formattedMoves = moves.map((m) => ({
    ...m,
    date: m.date.toISOString(),
  }));

  return <HistoryClient initialMoves={formattedMoves as unknown as React.ComponentProps<typeof HistoryClient>["initialMoves"]} />;
}
