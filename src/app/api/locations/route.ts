import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createWarehouseSchema = z.object({
  name: z.string().min(2, "Warehouse name is required"),
  shortCode: z.string().min(2, "Short code is required").toUpperCase(),
  address: z.string().min(5, "Address is required"),
});

const createLocationSchema = z.object({
  name: z.string().min(2, "Location name is required"),
  shortCode: z.string().min(2, "Short code is required"),
  type: z.enum(["INTERNAL", "VENDOR", "CUSTOMER", "INVENTORY_LOSS"]).default("INTERNAL"),
  warehouseId: z.string().optional(),
});

// GET /api/locations - Fetch all warehouses and their structured locations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const [warehouses, locations] = await Promise.all([
      prisma.warehouse.findMany({
        include: {
          locations: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.location.findMany({
        where: type && type !== "ALL" ? { type } : undefined,
        include: {
          warehouse: true,
          _count: {
            select: { stockLevels: true },
          },
        },
        orderBy: { shortCode: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        warehouses,
        locations,
      },
    });
  } catch (error: any) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch locations", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/locations - Create a new Warehouse or Location
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entityType = body.entityType; // "WAREHOUSE" | "LOCATION"

    if (entityType === "WAREHOUSE") {
      const validated = createWarehouseSchema.parse(body);
      const existing = await prisma.warehouse.findUnique({
        where: { shortCode: validated.shortCode },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Warehouse with code "${validated.shortCode}" already exists` },
          { status: 409 }
        );
      }

      const warehouse = await prisma.warehouse.create({
        data: validated,
      });
      return NextResponse.json({ success: true, data: warehouse }, { status: 201 });
    }

    // Default to Location creation
    const validated = createLocationSchema.parse(body);
    const existing = await prisma.location.findUnique({
      where: { shortCode: validated.shortCode },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Location with code "${validated.shortCode}" already exists` },
        { status: 409 }
      );
    }

    const location = await prisma.location.create({
      data: validated,
      include: { warehouse: true },
    });

    return NextResponse.json({ success: true, data: location }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating location/warehouse:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create location", details: error.message },
      { status: 500 }
    );
  }
}
