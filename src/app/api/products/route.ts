import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createProductSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters"),
  sku: z.string().trim().min(2, "SKU is required").toUpperCase(),
  category: z.string().trim().default("General"),
  uom: z.string().trim().default("Units"),
  perUnitCost: z.coerce.number().nonnegative("Per unit cost must be 0 or positive").default(0),
  minStock: z.coerce.number().nonnegative("Minimum reorder stock must be 0 or positive").default(10),
  initialStock: z.coerce.number().nonnegative("Initial stock must be 0 or positive").optional().default(0),
  locationId: z.string().optional(),
});

const updateStockSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  locationId: z.string().optional(),
  newOnHand: z.coerce.number().nonnegative("Stock quantity must be 0 or greater"),
  reason: z.string().optional().default("Manual Stock Adjustment via Dashboard"),
});

// GET /api/products - List products with real-time aggregated stock and reorder flags
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const where: Prisma.ProductWhereInput = {};
    if (search && search.trim() !== "") {
      const query = search.trim();
      where.OR = [
        { name: { contains: query } },
        { sku: { contains: query } },
      ];
    }
    if (category && category !== "ALL") {
      where.category = category;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        stockLevels: {
          include: {
            location: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Compute aggregated onHand and freeToUse across all locations
    const formatted = products.map((p) => {
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
        createdAt: p.createdAt,
      };
    });

    const results = lowStockOnly ? formatted.filter((p) => p.isLowStock) : formatted;

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (error: unknown) {
    console.error("Error fetching products:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product with optional initial stock
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createProductSchema.parse(body);

    const existingSku = await prisma.product.findUnique({
      where: { sku: validated.sku },
    });
    if (existingSku) {
      return NextResponse.json(
        { success: false, error: `Product with SKU "${validated.sku}" already exists` },
        { status: 409 }
      );
    }

    const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newProduct = await tx.product.create({
        data: {
          name: validated.name,
          sku: validated.sku,
          category: validated.category,
          uom: validated.uom,
          perUnitCost: validated.perUnitCost,
          minStock: validated.minStock,
        },
      });

      // Always create a stock level for the product at the specified or default internal location
      let locId = validated.locationId;
      if (!locId) {
        const defaultLoc = await tx.location.findFirst({
          where: { type: "INTERNAL" },
        });
        locId = defaultLoc?.id;
      }

      if (locId) {
        await tx.stockLevel.create({
          data: {
            productId: newProduct.id,
            locationId: locId,
            onHand: validated.initialStock || 0,
            reserved: 0,
          },
        });

        // If initial stock is positive, record opening balance in double-entry move ledger
        if (validated.initialStock && validated.initialStock > 0) {
          const vendorLoc = await tx.location.findFirst({
            where: { type: "VENDOR" },
          });
          const fromLocId = vendorLoc?.id || locId;

          await tx.stockMoveLedger.create({
            data: {
              reference: "OPENING-STOCK",
              productId: newProduct.id,
              fromLocationId: fromLocId,
              toLocationId: locId,
              quantity: validated.initialStock,
              moveType: "IN",
              status: "DONE",
              notes: "Initial inventory setup balance",
            },
          });
        }
      }

      // Return product with populated stockLevels
      return await tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          stockLevels: {
            include: {
              location: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating product:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PATCH /api/products - Direct stock adjustment from dashboard (as specified in wireframe)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = updateStockSchema.parse(body);

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Resolve target location: explicit or existing stock level or default internal location
      let locId = validated.locationId;
      if (!locId) {
        const existingLevel = await tx.stockLevel.findFirst({
          where: { productId: validated.productId },
        });
        locId = existingLevel?.locationId;
      }
      if (!locId) {
        const defaultLoc = await tx.location.findFirst({
          where: { type: "INTERNAL" },
        });
        locId = defaultLoc?.id;
      }
      if (!locId) {
        throw new Error("No storage location found for stock adjustment");
      }

      const current = await tx.stockLevel.findUnique({
        where: {
          productId_locationId: {
            productId: validated.productId,
            locationId: locId,
          },
        },
      });

      const oldOnHand = current?.onHand || 0;
      const difference = validated.newOnHand - oldOnHand;

      const updatedLevel = await tx.stockLevel.upsert({
        where: {
          productId_locationId: {
            productId: validated.productId,
            locationId: locId,
          },
        },
        update: {
          onHand: validated.newOnHand,
        },
        create: {
          productId: validated.productId,
          locationId: locId,
          onHand: validated.newOnHand,
          reserved: 0,
        },
      });

      // Find virtual loss location for ledger tracking
      const lossLoc = await tx.location.findFirst({
        where: { type: "INVENTORY_LOSS" },
      });
      const lossLocId = lossLoc?.id || locId;

      // Log adjustment in ledger only when quantity delta is non-zero
      if (difference !== 0) {
        await tx.stockMoveLedger.create({
          data: {
            reference: `ADJ-${Date.now().toString().slice(-4)}`,
            productId: validated.productId,
            fromLocationId: difference > 0 ? lossLocId : locId,
            toLocationId: difference > 0 ? locId : lossLocId,
            quantity: Math.abs(difference),
            moveType: "ADJUSTMENT",
            status: "DONE",
            notes: `${validated.reason} (Delta: ${difference > 0 ? "+" : ""}${difference})`,
          },
        });
      }

      return updatedLevel;
    });

    return NextResponse.json({
      success: true,
      message: "Stock level updated successfully",
      data: result,
    });
  } catch (error: unknown) {
    console.error("Error updating stock:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to update stock";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

