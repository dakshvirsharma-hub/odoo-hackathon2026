import React from "react";
import { getDashboardData } from "@/lib/dashboard";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardClient initialData={data as unknown as React.ComponentProps<typeof DashboardClient>["initialData"]} />;
}
