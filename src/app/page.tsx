"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import {
  Boxes,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
} from "lucide-react";

interface DashboardData {
  kpis: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    pendingReceipts: number;
    pendingDeliveries: number;
    scheduledTransfers: number;
    totalInventoryValue: number;
  };
  cards: {
    receipt: {
      late: number;
      totalOperations: number;
      toReceive: number;
    };
    delivery: {
      late: number;
      waiting: number;
      totalOperations: number;
      toDeliver: number;
    };
  };
  recentMoves: Array<{
    id: string;
    reference: string;
    quantity: number;
    moveType: string;
    status: string;
    date: string;
    notes?: string;
    product: { name: string; sku: string; uom: string };
    fromLocation: { name: string; shortCode: string };
    toLocation: { name: string; shortCode: string };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load dashboard metrics");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <AppShell>
      <div className="space-y-8 pb-10">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Overview</h2>
            <p className="text-sm text-slate-500 mt-1">
              Real-time stock valuation, pending warehouse transfers, and operational alerts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Feed
            </button>
            <Link
              href="/operations?type=RECEIPT&new=true"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Receipt
            </Link>
          </div>
        </div>

        {/* Error Alert State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Primary Dashboard KPIs (Matching Wireframe Spec) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card 1: Total Products */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {isLoading ? "..." : data?.kpis.totalProducts ?? 0}
              </span>
              <span className="text-xs text-slate-400 block mt-0.5">Active catalog SKUs</span>
            </div>
          </div>

          {/* Card 2: Low Stock Alerts */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Items</span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-amber-600">
                {isLoading ? "..." : data?.kpis.lowStockCount ?? 0}
              </span>
              <span className="text-xs text-amber-600/80 block mt-0.5">Below reorder point</span>
            </div>
          </div>

          {/* Card 3: Pending Receipts */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Receipts</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {isLoading ? "..." : data?.kpis.pendingReceipts ?? 0}
              </span>
              <span className="text-xs text-emerald-600 block mt-0.5">Vendor incoming</span>
            </div>
          </div>

          {/* Card 4: Pending Deliveries */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Deliveries</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {isLoading ? "..." : data?.kpis.pendingDeliveries ?? 0}
              </span>
              <span className="text-xs text-blue-600 block mt-0.5">Out for dispatch</span>
            </div>
          </div>

          {/* Card 5: Internal Transfers */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Internal Moves</span>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {isLoading ? "..." : data?.kpis.scheduledTransfers ?? 0}
              </span>
              <span className="text-xs text-purple-600 block mt-0.5">Rack to rack moves</span>
            </div>
          </div>

          {/* Card 6: Total Valuation */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Valuation</span>
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900 truncate block">
                ₹{isLoading ? "..." : (data?.kpis.totalInventoryValue ?? 0).toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-teal-600 block mt-0.5">Aggregated assets</span>
            </div>
          </div>
        </div>

        {/* 2. Operations Overview Tiles (Wireframe Spec: Receipt & Delivery Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tile 1: Receipts */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Receipts (Incoming Goods)</h3>
                  <p className="text-xs text-slate-500">Items arriving from suppliers & vendors</p>
                </div>
              </div>
              <Link
                href="/operations?type=RECEIPT"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                View All <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block font-medium">To Receive</span>
                <span className="text-xl font-bold text-emerald-600 mt-1 block">
                  {isLoading ? "..." : data?.cards.receipt.toReceive ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block font-medium">Late Deliveries</span>
                <span className="text-xl font-bold text-rose-600 mt-1 block">
                  {isLoading ? "..." : data?.cards.receipt.late ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block font-medium">Total Operations</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">
                  {isLoading ? "..." : data?.cards.receipt.totalOperations ?? 0}
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Link
                href="/operations?type=RECEIPT"
                className="flex-1 py-2 text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                View Receipt List
              </Link>
              <Link
                href="/operations?type=RECEIPT&new=true"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Receipt
              </Link>
            </div>
          </div>

          {/* Tile 2: Delivery Orders */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100 text-blue-800">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Delivery Orders (Outgoing Goods)</h3>
                  <p className="text-xs text-slate-500">Pick, pack & dispatch to customer destinations</p>
                </div>
              </div>
              <Link
                href="/operations?type=DELIVERY"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                View All <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block font-medium">To Deliver</span>
                <span className="text-xl font-bold text-blue-600 mt-1 block">
                  {isLoading ? "..." : data?.cards.delivery.toDeliver ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block font-medium">Waiting Stock</span>
                <span className="text-xl font-bold text-amber-600 mt-1 block">
                  {isLoading ? "..." : data?.cards.delivery.waiting ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block font-medium">Late Orders</span>
                <span className="text-xl font-bold text-rose-600 mt-1 block">
                  {isLoading ? "..." : data?.cards.delivery.late ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block font-medium">Total Operations</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">
                  {isLoading ? "..." : data?.cards.delivery.totalOperations ?? 0}
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Link
                href="/operations?type=DELIVERY"
                className="flex-1 py-2 text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                View Delivery List
              </Link>
              <Link
                href="/operations?type=DELIVERY&new=true"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Delivery
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Recent Move History Ledger (Color-Coded Wireframe Spec) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Stock Movements</h3>
              <p className="text-xs text-slate-500">Immutable double-entry audit ledger entries</p>
            </div>
            <Link
              href="/history"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Full Move History <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5">Reference</th>
                  <th className="py-3 px-5">Product</th>
                  <th className="py-3 px-5">From</th>
                  <th className="py-3 px-5">To</th>
                  <th className="py-3 px-5 text-right">Quantity</th>
                  <th className="py-3 px-5">Direction</th>
                  <th className="py-3 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading audit ledger...
                    </td>
                  </tr>
                ) : data?.recentMoves && data.recentMoves.length > 0 ? (
                  data.recentMoves.map((m) => {
                    const isIn = m.moveType === "IN";
                    const isOut = m.moveType === "OUT";
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-5 font-mono text-xs font-semibold text-slate-800">
                          {m.reference}
                        </td>
                        <td className="py-3 px-5 font-medium text-slate-800">
                          {m.product.name} <span className="text-slate-400 text-xs">({m.product.sku})</span>
                        </td>
                        <td className="py-3 px-5 text-xs text-slate-600">
                          {m.fromLocation.name}
                        </td>
                        <td className="py-3 px-5 text-xs text-slate-600">
                          {m.toLocation.name}
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-semibold text-slate-900">
                          {m.quantity} {m.product.uom}
                        </td>
                        <td className="py-3 px-5">
                          {/* Wireframe spec: In moves shown green, Out moves shown red */}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              isIn
                                ? "bg-emerald-100 text-emerald-700"
                                : isOut
                                ? "bg-rose-100 text-rose-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {m.moveType}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {m.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
