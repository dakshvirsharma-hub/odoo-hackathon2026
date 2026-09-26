import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/ledger - Immutable audit trail of all inventory movements
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const moveType = searchParams.get("moveType"); // "IN" | "OUT" | "INTERNAL" | "ADJUSTMENT"
    const status = searchParams.get("status");
    const locationId = searchParams.get("locationId");
    const productId = searchParams.get("productId");

    const where: any = {};

    if (moveType && moveType !== "ALL") {
      where.moveType = moveType;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (productId && productId !== "ALL") {
      where.productId = productId;
    }

    if (locationId && locationId !== "ALL") {
      where.OR = [
        { fromLocationId: locationId },
        { toLocationId: locationId },
      ];
    }

    if (search && search.trim() !== "") {
      where.OR = [
        { reference: { contains: search } },
        { contact: { contains: search } },
        { notes: { contains: search } },
        { product: { name: { contains: search } } },
        { product: { sku: { contains: search } } },
      ];
    }

    const moves = await prisma.stockMoveLedger.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            uom: true,
            category: true,
            perUnitCost: true,
          },
        },
        fromLocation: {
          select: {
            id: true,
            name: true,
            shortCode: true,
            type: true,
          },
        },
        toLocation: {
          select: {
            id: true,
            name: true,
            shortCode: true,
            type: true,
          },
        },
      },
    });

    // Compute ledger stats
    const totalMoves = moves.length;
    const inCount = moves.filter((m) => m.moveType === "IN").length;
    const outCount = moves.filter((m) => m.moveType === "OUT").length;
    const internalCount = moves.filter((m) => m.moveType === "INTERNAL").length;
    const adjustmentCount = moves.filter((m) => m.moveType === "ADJUSTMENT").length;

    return NextResponse.json({
      success: true,
      count: totalMoves,
      summary: {
        totalMoves,
        inCount,
        outCount,
        internalCount,
        adjustmentCount,
      },
      data: moves,
    });
  } catch (error: any) {
    console.error("Error fetching move ledger:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch move ledger", details: error.message },
      { status: 500 }
    );
  }
}
