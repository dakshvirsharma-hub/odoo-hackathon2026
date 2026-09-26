"use client";

import React, { useEffect, useState, useTransition } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Warehouse,
  MapPin,
  Plus,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface LocationItem {
  id: string;
  name: string;
  shortCode: string;
  type: string;
  warehouseId: string | null;
  warehouse?: { name: string; shortCode: string };
  _count?: { stockLevels: number };
}

interface WarehouseItem {
  id: string;
  name: string;
  shortCode: string;
  address: string;
  locations: LocationItem[];
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"WAREHOUSE" | "LOCATION">("WAREHOUSE");
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Warehouse form
  const [whName, setWhName] = useState("");
  const [whCode, setWhCode] = useState("");
  const [whAddress, setWhAddress] = useState("");

  // Create Location form
  const [locName, setLocName] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locType, setLocType] = useState<"INTERNAL" | "VENDOR" | "CUSTOMER" | "INVENTORY_LOSS">("INTERNAL");
  const [locParentWh, setLocParentWh] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/locations");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load locations");
      setWarehouses(json.data.warehouses);
      setLocations(json.data.locations);
      if (json.data.warehouses.length > 0 && !locParentWh) {
        setLocParentWh(json.data.warehouses[0].id);
      }
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch("/api/locations");
        const json = await res.json();
        if (!ignore && json.success) {
          setWarehouses(json.data.warehouses);
          setLocations(json.data.locations);
          if (json.data.warehouses.length > 0) {
            setLocParentWh(json.data.warehouses[0].id);
          }
        }
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : "Init error");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "WAREHOUSE",
            name: whName,
            shortCode: whCode.toUpperCase(),
            address: whAddress,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Creation failed");
        setWhName("");
        setWhCode("");
        setWhAddress("");
        await loadData();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Creation failed");
      }
    });
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "LOCATION",
            name: locName,
            shortCode: locCode,
            type: locType,
            warehouseId: locType === "INTERNAL" ? locParentWh : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Creation failed");
        setLocName("");
        setLocCode("");
        await loadData();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Creation failed");
      }
    });
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Warehouse & Locations Settings</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure physical storage hubs, aisle locations, and virtual counterparties.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Wireframe spec: 1. Warehouse 2. Locations sub-tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("WAREHOUSE")}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "WAREHOUSE"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="w-4 h-4" /> 1. Warehouses ({warehouses.length})
          </button>
          <button
            onClick={() => setActiveTab("LOCATION")}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "LOCATION"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MapPin className="w-4 h-4" /> 2. Locations ({locations.length})
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Warehouse Settings (Wireframe Screen 4) */}
        {activeTab === "WAREHOUSE" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-600">
                  Registered Warehouses
                </div>
                <div className="divide-y divide-slate-100">
                  {warehouses.map((wh) => (
                    <div key={wh.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-indigo-600" />
                          <h4 className="font-bold text-sm text-slate-900">{wh.name}</h4>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">
                            {wh.shortCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{wh.address}</p>
                        <span className="inline-block text-[11px] text-slate-400">
                          {wh.locations?.length || 0} designated zones/racks
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Create Warehouse Form (Wireframe Screen 4: Name, Short Code, Address) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Add New Warehouse
              </h3>
              <form onSubmit={handleCreateWarehouse} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Warehouse Name</label>
                  <input
                    type="text"
                    required
                    value={whName}
                    onChange={(e) => setWhName(e.target.value)}
                    placeholder="e.g. Central Logistics Depot"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Short Code</label>
                  <input
                    type="text"
                    required
                    value={whCode}
                    onChange={(e) => setWhCode(e.target.value)}
                    placeholder="e.g. WH3"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg uppercase font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Physical Address</label>
                  <textarea
                    rows={2}
                    required
                    value={whAddress}
                    onChange={(e) => setWhAddress(e.target.value)}
                    placeholder="e.g. Sector 22, Phase 3, Industrial Area"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Save Warehouse
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Location Settings (Wireframe Screen 5) */}
        {activeTab === "LOCATION" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-600">
                  Storage Locations & Racks
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Location Name</th>
                        <th className="py-2.5 px-4">Code / Reference</th>
                        <th className="py-2.5 px-4">Parent Warehouse</th>
                        <th className="py-2.5 px-4">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {locations.map((loc) => (
                        <tr key={loc.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-semibold text-slate-800">{loc.name}</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600">{loc.shortCode}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {loc.warehouse?.name || "Virtual / External"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                loc.type === "INTERNAL"
                                  ? "bg-blue-100 text-blue-800"
                                  : loc.type === "VENDOR"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : loc.type === "CUSTOMER"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {loc.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Create Location Form (Wireframe Screen 5: Name, Short Code, Warehouse link, WH reference) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Add Storage Location
              </h3>
              <form onSubmit={handleCreateLocation} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Location Name</label>
                  <input
                    type="text"
                    required
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="e.g. Stock3, Packing Shelf B"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Short Code / Reference</label>
                  <input
                    type="text"
                    required
                    value={locCode}
                    onChange={(e) => setLocCode(e.target.value)}
                    placeholder="e.g. WH/Stock3"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Location Type</label>
                  <select
                    value={locType}
                    onChange={(e) => setLocType(e.target.value as "INTERNAL" | "VENDOR" | "CUSTOMER" | "INVENTORY_LOSS")}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="INTERNAL">Internal Storage (WH Rack/Room)</option>
                    <option value="VENDOR">Vendor / Supplier Counterparty</option>
                    <option value="CUSTOMER">Customer / Dispatch Counterparty</option>
                    <option value="INVENTORY_LOSS">Virtual Loss / Scrap Account</option>
                  </select>
                </div>
                {locType === "INTERNAL" && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Parent Warehouse</label>
                    <select
                      value={locParentWh}
                      onChange={(e) => setLocParentWh(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} [{w.shortCode}]
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Save Location
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
