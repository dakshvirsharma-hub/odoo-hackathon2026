import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z.string().min(2, "SKU is required").toUpperCase(),
  category: z.string().default("General"),
  uom: z.string().default("Units"),
  perUnitCost: z.number().nonnegative("Per unit cost must be 0 or positive"),
  minStock: z.number().nonnegative("Minimum reorder stock must be 0 or positive").default(10),
  initialStock: z.number().nonnegative().optional().default(0),
  locationId: z.string().optional(),
});

const updateStockSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  locationId: z.string().min(1, "Location ID is required"),
  newOnHand: z.number().nonnegative("Stock quantity must be 0 or greater"),
  reason: z.string().optional().default("Manual Stock Adjustment via Dashboard"),
});

// GET /api/products - List products with real-time aggregated stock and reorder flags
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const where: Prisma.ProductWhereInput = {};
    if (search && search.trim() !== "") {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
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
      const totalOnHand = p.stockLevels.reduce((sum, sl) => sum + sl.onHand, 0);
      const totalReserved = p.stockLevels.reduce((sum, sl) => sum + sl.reserved, 0);
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
        stockLevels: p.stockLevels.map((sl) => ({
          locationId: sl.locationId,
          locationName: sl.location.name,
          locationCode: sl.location.shortCode,
          onHand: sl.onHand,
          reserved: sl.reserved,
          freeToUse: Math.max(0, sl.onHand - sl.reserved),
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

    const product = await prisma.$transaction(async (tx) => {
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

      // If initial stock is provided, create stock level at specified or default internal location
      if (validated.initialStock > 0) {
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
              onHand: validated.initialStock,
              reserved: 0,
            },
          });

          // Log opening balance move in ledger
          await tx.stockMoveLedger.create({
            data: {
              reference: "OPENING-STOCK",
              productId: newProduct.id,
              fromLocationId: locId,
              toLocationId: locId,
              quantity: validated.initialStock,
              moveType: "IN",
              status: "DONE",
              notes: "Initial inventory setup balance",
            },
          });
        }
      }

      return newProduct;
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

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.stockLevel.findUnique({
        where: {
          productId_locationId: {
            productId: validated.productId,
            locationId: validated.locationId,
          },
        },
      });

      const oldOnHand = current?.onHand || 0;
      const difference = validated.newOnHand - oldOnHand;

      const updatedLevel = await tx.stockLevel.upsert({
        where: {
          productId_locationId: {
            productId: validated.productId,
            locationId: validated.locationId,
          },
        },
        update: {
          onHand: validated.newOnHand,
        },
        create: {
          productId: validated.productId,
          locationId: validated.locationId,
          onHand: validated.newOnHand,
          reserved: 0,
        },
      });

      // Find virtual loss location for ledger tracking
      const lossLoc = await tx.location.findFirst({
        where: { type: "INVENTORY_LOSS" },
      });
      const lossLocId = lossLoc?.id || validated.locationId;

      // Log adjustment in ledger
      await tx.stockMoveLedger.create({
        data: {
          reference: `ADJ-${Date.now().toString().slice(-4)}`,
          productId: validated.productId,
          fromLocationId: difference >= 0 ? lossLocId : validated.locationId,
          toLocationId: difference >= 0 ? validated.locationId : lossLocId,
          quantity: Math.abs(difference),
          moveType: "ADJUSTMENT",
          status: "DONE",
          notes: `${validated.reason} (Delta: ${difference > 0 ? "+" : ""}${difference})`,
        },
      });

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
