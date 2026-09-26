"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Search,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List as ListIcon,
  RefreshCw,
  AlertCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface MoveRecord {
  id: string;
  reference: string;
  quantity: number;
  moveType: "IN" | "OUT" | "INTERNAL" | "ADJUSTMENT";
  status: string;
  date: string;
  contact: string | null;
  notes: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
    uom: string;
    category: string;
  };
  fromLocation: {
    id: string;
    name: string;
    shortCode: string;
  };
  toLocation: {
    id: string;
    name: string;
    shortCode: string;
  };
}

export interface HistoryClientProps {
  initialMoves: MoveRecord[];
}

export default function HistoryClient({ initialMoves }: HistoryClientProps) {
  const [moves, setMoves] = useState<MoveRecord[]>(initialMoves);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"LIST" | "KANBAN">("LIST");

  const loadMoves = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (selectedType !== "ALL") params.append("moveType", selectedType);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);

      const res = await fetch(`/api/ledger?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load ledger");
      setMoves(json.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching move history");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Stock Move History</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Immutable double-entry inventory audit ledger recording all physical stock transfers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadMoves}
              disabled={isLoading}
              className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
              <button
                onClick={() => setViewMode("LIST")}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "LIST" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("KANBAN")}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "KANBAN" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Kanban View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Move Direction Selector (Wireframe: In moves green, Out moves red) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { label: "All Movements", val: "ALL" },
                { label: "IN (Receipts)", val: "IN" },
                { label: "OUT (Deliveries)", val: "OUT" },
                { label: "INTERNAL (Transfers)", val: "INTERNAL" },
                { label: "ADJUSTMENT (Scrap)", val: "ADJUSTMENT" },
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => setSelectedType(tab.val)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    selectedType === tab.val
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input (Wireframe spec: search by reference & contacts) */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadMoves()}
                placeholder="Search ref or contact..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Status:</span>
              {["ALL", "DONE", "READY", "CANCELED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedStatus === status
                      ? "bg-indigo-100 text-indigo-800 font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <span className="text-slate-400 font-medium">
              {moves.length} recorded transfers
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. LIST VIEW (Default Wireframe Screen 11 Spec) */}
        {viewMode === "LIST" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-5">Reference</th>
                    <th className="py-3 px-5">Product</th>
                    <th className="py-3 px-5">From</th>
                    <th className="py-3 px-5">To</th>
                    <th className="py-3 px-5">Contact</th>
                    <th className="py-3 px-5 text-right">Quantity</th>
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        Loading audit ledger...
                      </td>
                    </tr>
                  ) : moves.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No movement records found.
                      </td>
                    </tr>
                  ) : (
                    moves.map((m) => {
                      const isIn = m.moveType === "IN";
                      const isOut = m.moveType === "OUT";
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-5 font-mono text-xs font-bold text-slate-900">
                            {m.reference}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="font-semibold text-slate-800 text-xs block">
                              {m.product.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 block">
                              {m.product.sku}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-xs text-slate-600 font-medium">
                            {m.fromLocation.name}
                          </td>
                          <td className="py-3.5 px-5 text-xs text-slate-600 font-medium">
                            {m.toLocation.name}
                          </td>
                          <td className="py-3.5 px-5 text-xs text-slate-700">
                            {m.contact || "Internal"}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            {/* Wireframe spec: In moves shown in green, Out moves shown in red */}
                            <span
                              className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded ${
                                isIn
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isOut
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {isIn ? <TrendingUp className="w-3 h-3" /> : isOut ? <TrendingDown className="w-3 h-3" /> : null}
                              {isIn ? "+" : isOut ? "-" : ""}
                              {m.quantity} {m.product.uom}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-xs text-slate-500">
                            {new Date(m.date).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. KANBAN VIEW (Wireframe Spec: switch to kanban view based on status) */}
        {viewMode === "KANBAN" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["DONE", "READY", "CANCELED"].map((status) => {
              const statusMoves = moves.filter((m) => m.status === status);
              return (
                <div key={status} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      {status === "DONE" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-blue-600" />}
                      {status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-300">
                      {statusMoves.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {statusMoves.map((m) => {
                      const isIn = m.moveType === "IN";
                      const isOut = m.moveType === "OUT";
                      return (
                        <div
                          key={m.id}
                          className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-900">{m.reference}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isIn
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isOut
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {m.moveType}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{m.product.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {m.fromLocation.name} → {m.toLocation.name}
                            </p>
                          </div>
                          <div className="text-[11px] font-medium text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                            <span>{m.contact || "Internal"}</span>
                            <span className="font-mono font-bold text-slate-900">
                              {m.quantity} {m.product.uom}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {statusMoves.length === 0 && (
                      <div className="h-24 flex items-center justify-center text-xs text-slate-400 italic">
                        No records
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
