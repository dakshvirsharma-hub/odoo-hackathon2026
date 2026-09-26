import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateStockOperation } from "@/lib/stock-engine";
import { z } from "zod";

const patchActionSchema = z.object({
  action: z.enum(["mark_ready", "validate", "cancel"]),
});

// GET /api/operations/[id] - Fetch single operation detail with lines and ledger moves
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const operation = await prisma.stockOperation.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
        moves: {
          include: {
            fromLocation: true,
            toLocation: true,
          },
        },
      },
    });

    if (!operation) {
      return NextResponse.json(
        { success: false, error: "Stock operation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: operation });
  } catch (error: unknown) {
    console.error("Error fetching operation detail:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch operation";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PATCH /api/operations/[id] - Lifecycle triggers (Draft -> Ready -> Done / Cancel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = patchActionSchema.parse(body);

    const operation = await prisma.stockOperation.findUnique({
      where: { id },
      include: {
        lines: true,
      },
    });

    if (!operation) {
      return NextResponse.json(
        { success: false, error: "Stock operation not found" },
        { status: 404 }
      );
    }

    if (action === "mark_ready") {
      // Wireframe spec: 'TODO = when in Draft; on click TODO -> move to Ready'
      if (operation.status !== "DRAFT" && operation.status !== "WAITING") {
        return NextResponse.json(
          { success: false, error: `Cannot move to READY from status ${operation.status}` },
          { status: 400 }
        );
      }

      const updated = await prisma.stockOperation.update({
        where: { id },
        data: { status: "READY" },
        include: { lines: { include: { product: true } } },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "validate") {
      // Wireframe spec: 'Validate = when in Ready; on click Validate -> move to Done & adjust stock'
      if (operation.status === "DONE") {
        return NextResponse.json(
          { success: false, error: "Operation is already completed" },
          { status: 400 }
        );
      }

      // Execute double-entry stock update and ledger logging atomically
      const completedOp = await validateStockOperation(id);
      return NextResponse.json({
        success: true,
        message: "Stock validated and inventory ledger updated successfully",
        data: completedOp,
      });
    }

    if (action === "cancel") {
      if (operation.status === "DONE") {
        return NextResponse.json(
          { success: false, error: "Cannot cancel an already completed operation" },
          { status: 400 }
        );
      }

      const updated = await prisma.stockOperation.update({
        where: { id },
        data: { status: "CANCELED" },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Error updating operation:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to update operation";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
