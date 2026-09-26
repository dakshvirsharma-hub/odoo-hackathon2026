import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/search - Global multi-entity inventory search (Products, Operations, Locations, Ledger)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        results: {
          products: [],
          operations: [],
          locations: [],
        },
      });
    }

    const trimmed = query.trim();

    const [products, operations, locations] = await Promise.all([
      // 1. Search Products
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: trimmed } },
            { sku: { contains: trimmed } },
            { category: { contains: trimmed } },
          ],
        },
        take: 5,
        include: {
          stockLevels: {
            include: { location: true },
          },
        },
      }),

      // 2. Search Operations (Receipts, Deliveries, Transfers)
      prisma.stockOperation.findMany({
        where: {
          OR: [
            { reference: { contains: trimmed } },
            { contact: { contains: trimmed } },
            { notes: { contains: trimmed } },
          ],
        },
        take: 5,
        include: {
          lines: {
            include: { product: true },
          },
        },
      }),

      // 3. Search Locations
      prisma.location.findMany({
        where: {
          OR: [
            { name: { contains: trimmed } },
            { shortCode: { contains: trimmed } },
          ],
        },
        take: 5,
        include: {
          warehouse: true,
        },
      }),
    ]);

    // Format products with live free-to-use stock
    const formattedProducts = products.map((p) => {
      const onHand = p.stockLevels.reduce((acc, sl) => acc + sl.onHand, 0);
      const reserved = p.stockLevels.reduce((acc, sl) => acc + sl.reserved, 0);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        onHand,
        freeToUse: Math.max(0, onHand - reserved),
        perUnitCost: p.perUnitCost,
      };
    });

    return NextResponse.json({
      success: true,
      query: trimmed,
      results: {
        products: formattedProducts,
        operations,
        locations,
      },
    });
  } catch (error: any) {
    console.error("Error running global search:", error);
    return NextResponse.json(
      { success: false, error: "Global search failed", details: error.message },
      { status: 500 }
    );
  }
}
