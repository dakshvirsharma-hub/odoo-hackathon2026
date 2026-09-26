import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOperationReference } from "@/lib/stock-engine";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const createOperationSchema = z.object({
  type: z.enum(["RECEIPT", "DELIVERY", "INTERNAL", "ADJUSTMENT"]),
  contact: z.string().optional(),
  scheduleDate: z.string().optional(),
  responsibleName: z.string().optional(),
  sourceLocationId: z.string().optional(),
  destLocationId: z.string().optional(),
  warehouseCode: z.string().default("WH"),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        qtyDemanded: z.number().positive("Quantity must be greater than 0"),
      })
    )
    .min(1, "At least one line item is required"),
});

// GET /api/operations - Filterable by type, status, and search query
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Prisma.StockOperationWhereInput = {};

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search && search.trim() !== "") {
      where.OR = [
        { reference: { contains: search } },
        { contact: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const operations = await prisma.stockOperation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, count: operations.length, data: operations });
  } catch (error: unknown) {
    console.error("Error fetching operations:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch operations";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/operations - Create new Receipt, Delivery, Transfer, or Adjustment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createOperationSchema.parse(body);

    const reference = await generateOperationReference(
      validated.warehouseCode,
      validated.type
    );

    // Resolve default locations based on operation type if omitted
    let sourceLocId = validated.sourceLocationId;
    let destLocId = validated.destLocationId;

    if (!sourceLocId || !destLocId) {
      const defaultInternal = await prisma.location.findFirst({ where: { type: "INTERNAL" } });
      const defaultVendor = await prisma.location.findFirst({ where: { type: "VENDOR" } });
      const defaultCustomer = await prisma.location.findFirst({ where: { type: "CUSTOMER" } });
      const defaultLoss = await prisma.location.findFirst({ where: { type: "INVENTORY_LOSS" } });

      if (validated.type === "RECEIPT") {
        sourceLocId = sourceLocId || defaultVendor?.id;
        destLocId = destLocId || defaultInternal?.id;
      } else if (validated.type === "DELIVERY") {
        sourceLocId = sourceLocId || defaultInternal?.id;
        destLocId = destLocId || defaultCustomer?.id;
      } else if (validated.type === "ADJUSTMENT") {
        sourceLocId = sourceLocId || defaultInternal?.id;
        destLocId = destLocId || defaultLoss?.id;
      } else {
        sourceLocId = sourceLocId || defaultInternal?.id;
        const secondLoc = await prisma.location.findFirst({
          where: { type: "INTERNAL", id: { not: sourceLocId } },
        });
        destLocId = destLocId || secondLoc?.id || defaultInternal?.id;
      }
    }

    // Default status: Draft
    const newOperation = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const op = await tx.stockOperation.create({
        data: {
          reference,
          type: validated.type,
          status: "DRAFT",
          contact: validated.contact || (validated.type === "RECEIPT" ? "Vendor" : "Customer"),
          scheduleDate: validated.scheduleDate ? new Date(validated.scheduleDate) : new Date(),
          responsibleName: validated.responsibleName || "Dakshvir Sharma",
          sourceLocationId: sourceLocId,
          destLocationId: destLocId,
          notes: validated.notes,
        },
      });

      // Create line items and check stock availability for deliveries
      for (const line of validated.lines) {
        let isOutOfStock = false;

        if (validated.type === "DELIVERY" && sourceLocId) {
          const stock = await tx.stockLevel.findUnique({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: sourceLocId,
              },
            },
          });
          const available = (stock?.onHand || 0) - (stock?.reserved || 0);
          if (available < line.qtyDemanded) {
            isOutOfStock = true;
          }
        }

        await tx.stockOperationLine.create({
          data: {
            operationId: op.id,
            productId: line.productId,
            qtyDemanded: line.qtyDemanded,
            qtyDone: 0,
            isOutOfStock,
          },
        });
      }

      return await tx.stockOperation.findUnique({
        where: { id: op.id },
        include: {
          lines: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data: newOperation }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating operation:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to create operation";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
