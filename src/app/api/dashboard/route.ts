import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

// GET /api/dashboard - Real-time KPIs and operational metrics
export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("Error computing dashboard metrics:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard metrics", details: message },
      { status: 500 }
    );
  }
}
