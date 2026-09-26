import React from "react";
import prisma from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [warehouses, locations] = await Promise.all([
    prisma.warehouse.findMany({
      include: {
        locations: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      include: {
        warehouse: true,
        _count: {
          select: { stockLevels: true },
        },
      },
      orderBy: { shortCode: "asc" },
    }),
  ]);

  return (
    <SettingsClient
      initialWarehouses={warehouses as unknown as React.ComponentProps<typeof SettingsClient>["initialWarehouses"]}
      initialLocations={locations as unknown as React.ComponentProps<typeof SettingsClient>["initialLocations"]}
    />
  );
}
