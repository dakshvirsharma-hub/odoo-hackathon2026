import React, { Suspense } from "react";
import prisma from "@/lib/prisma";
import OperationsClient from "./OperationsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    new?: string;
  }>;
}

export default async function OperationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialType = params.type ? params.type.toUpperCase() : "ALL";
  const initialCreateOpen = params.new === "true";

  const [operations, products] = await Promise.all([
    prisma.stockOperation.findMany({
      where: initialType !== "ALL" ? { type: initialType } : undefined,
      include: {
        lines: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        uom: true,
      },
    }),
  ]);

  const formattedOps = operations.map((op) => ({
    ...op,
    scheduleDate: op.scheduleDate.toISOString(),
  }));

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading operations...</div>}>
      <OperationsClient
        key={`${initialType}-${initialCreateOpen}`}
        initialOperations={formattedOps as unknown as React.ComponentProps<typeof OperationsClient>["initialOperations"]}
        initialProducts={products as unknown as React.ComponentProps<typeof OperationsClient>["initialProducts"]}
        initialType={initialType}
        initialCreateOpen={initialCreateOpen}
      />
    </Suspense>
  );
}
