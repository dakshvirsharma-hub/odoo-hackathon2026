"use client";

import React, { useState, useTransition } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  RefreshCw,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

interface OperationLine {
  id: string;
  productId: string;
  qtyDemanded: number;
  qtyDone: number;
  isOutOfStock: boolean;
  product: Product;
}

interface Operation {
  id: string;
  reference: string;
  type: "RECEIPT" | "DELIVERY" | "INTERNAL" | "ADJUSTMENT";
  status: "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELED";
  contact: string | null;
  scheduleDate: string;
  responsibleName: string | null;
  sourceLocationId: string | null;
  destLocationId: string | null;
  notes: string | null;
  lines: OperationLine[];
}


export interface OperationsClientProps {
  initialOperations: Operation[];
  initialProducts: Product[];
  initialType?: string;
  initialCreateOpen?: boolean;
}

export default function OperationsClient({
  initialOperations,
  initialProducts,
  initialType = "ALL",
  initialCreateOpen = false,
}: OperationsClientProps) {
  const [operations, setOperations] = useState<Operation[]>(initialOperations);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"LIST" | "KANBAN">("LIST");

  // Modals
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(initialCreateOpen);
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);

  // Create Form State
  const [newType, setNewType] = useState<"RECEIPT" | "DELIVERY" | "INTERNAL">(
    initialType && ["RECEIPT", "DELIVERY", "INTERNAL"].includes(initialType)
      ? (initialType as "RECEIPT" | "DELIVERY" | "INTERNAL")
      : "RECEIPT"
  );
  const [newContact, setNewContact] = useState("");
  const [newProductId, setNewProductId] = useState(initialProducts[0]?.id || "");
  const [newQty, setNewQty] = useState(1);
  const [newNotes, setNewNotes] = useState("");

  const loadOperations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== "ALL") params.append("type", selectedType);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/operations?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load operations");
      setOperations(json.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching operations");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setAllProducts(json.data);
        if (!newProductId) setNewProductId(json.data[0].id);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleAction = async (opId: string, action: "mark_ready" | "validate" | "cancel") => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/operations/${opId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Action failed");
        }
        await loadOperations();
        if (selectedOp && selectedOp.id === opId) {
          setSelectedOp(json.data);
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  };

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          contact: newContact || (newType === "RECEIPT" ? "Supplier" : "Customer"),
          warehouseCode: "WH",
          notes: newNotes,
          lines: [
            {
              productId: newProductId,
              qtyDemanded: Number(newQty),
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to create operation");
      setIsCreateOpen(false);
      setNewContact("");
      setNewNotes("");
      await loadOperations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Creation failed");
    }
  };

  const getStatusBadge = (status: Operation["status"]) => {
    switch (status) {
      case "DRAFT":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Draft</span>;
      case "WAITING":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Waiting</span>;
      case "READY":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Ready</span>;
      case "DONE":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done</span>;
      case "CANCELED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Canceled</span>;
    }
  };

  // Group operations for Kanban view
  const kanbanColumns: Array<{ status: Operation["status"]; title: string; color: string }> = [
    { status: "DRAFT", title: "Draft", color: "bg-slate-100 border-slate-300" },
    { status: "WAITING", title: "Waiting (Shortage)", color: "bg-amber-50 border-amber-300" },
    { status: "READY", title: "Ready for Processing", color: "bg-blue-50 border-blue-300" },
    { status: "DONE", title: "Validated & Completed", color: "bg-emerald-50 border-emerald-300" },
  ];

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Top Header & New Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Operations Control Center</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage receipts, customer dispatches, and internal inventory transfers with double-entry validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadOperations}
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
            <button
              onClick={() => {
                loadProducts();
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Operation
            </button>
          </div>
        </div>

        {/* Filters Bar matching Wireframe specs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Document Type Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { label: "All Types", val: "ALL" },
                { label: "Receipts (IN)", val: "RECEIPT" },
                { label: "Deliveries (OUT)", val: "DELIVERY" },
                { label: "Internal Moves", val: "INTERNAL" },
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => {
                    setSelectedType(tab.val);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    selectedType === tab.val
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadOperations()}
                placeholder="Search ref or contact..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Status Sub-Filters */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium mr-1">Status:</span>
            {["ALL", "DRAFT", "WAITING", "READY", "DONE", "CANCELED"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setSelectedStatus(status);
                }}
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
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. LIST VIEW (Default Wireframe Spec) */}
        {viewMode === "LIST" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-5">Reference</th>
                    <th className="py-3 px-5">Type</th>
                    <th className="py-3 px-5">Contact</th>
                    <th className="py-3 px-5">Scheduled Date</th>
                    <th className="py-3 px-5">Responsible</th>
                    <th className="py-3 px-5">Items</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        Loading operations...
                      </td>
                    </tr>
                  ) : operations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No operations found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    operations.map((op) => (
                      <tr
                        key={op.id}
                        onClick={() => setSelectedOp(op)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-5 font-mono text-xs font-bold text-indigo-600">
                          {op.reference}
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              op.type === "RECEIPT"
                                ? "bg-emerald-50 text-emerald-700"
                                : op.type === "DELIVERY"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {op.type === "RECEIPT" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {op.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-medium text-slate-800 text-xs">
                          {op.contact || "—"}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 text-xs">
                          {new Date(op.scheduleDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 text-xs">
                          {op.responsibleName || "Dakshvir Sharma"}
                        </td>
                        <td className="py-3.5 px-5 text-xs text-slate-600">
                          {op.lines.length} item{op.lines.length > 1 ? "s" : ""}
                          {op.lines.some((l) => l.isOutOfStock) && (
                            <span className="ml-2 inline-flex items-center text-rose-600 font-bold text-[10px]">
                              ● Out of Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">{getStatusBadge(op.status)}</td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOp(op);
                            }}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Open Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. KANBAN VIEW (Wireframe Spec: Switch to kanban view based on status) */}
        {viewMode === "KANBAN" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kanbanColumns.map((col) => {
              const colOps = operations.filter((op) => op.status === col.status);
              return (
                <div key={col.status} className={`p-4 rounded-xl border ${col.color} flex flex-col min-h-[400px]`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      {col.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/80 text-slate-700 border border-slate-300">
                      {colOps.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colOps.map((op) => (
                      <div
                        key={op.id}
                        onClick={() => setSelectedOp(op)}
                        className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-indigo-600">{op.reference}</span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">{op.type}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 truncate">{op.contact || "Standard Transfer"}</p>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span>{op.lines.length} lines</span>
                          <span>{new Date(op.scheduleDate).toLocaleDateString()}</span>
                        </div>
                        {op.lines.some((l) => l.isOutOfStock) && (
                          <div className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Shortage Detected
                          </div>
                        )}
                      </div>
                    ))}
                    {colOps.length === 0 && (
                      <div className="h-24 flex items-center justify-center text-xs text-slate-400 italic">
                        No cards
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. DETAIL / FORM VIEW MODAL (Wireframe Spec: Receipt & Delivery Form View) */}
        {selectedOp && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                    {selectedOp.type === "RECEIPT" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {selectedOp.type} <span className="font-mono text-indigo-600">{selectedOp.reference}</span>
                    </h3>
                    <p className="text-xs text-slate-500">Operation details and lifecycle validation</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOp(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Flow Progress Bar (Wireframe: Draft -> Ready -> Done) */}
              <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-6">
                  <div className={`flex items-center gap-1.5 ${selectedOp.status === "DRAFT" ? "font-bold text-indigo-600" : "text-slate-400"}`}>
                    <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">1</span> Draft
                  </div>
                  <span className="text-slate-300">→</span>
                  <div className={`flex items-center gap-1.5 ${selectedOp.status === "WAITING" ? "font-bold text-amber-600" : selectedOp.status === "READY" ? "font-bold text-blue-600" : "text-slate-400"}`}>
                    <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">2</span>
                    {selectedOp.status === "WAITING" ? "Waiting (Shortage)" : "Ready"}
                  </div>
                  <span className="text-slate-300">→</span>
                  <div className={`flex items-center gap-1.5 ${selectedOp.status === "DONE" ? "font-bold text-emerald-600" : "text-slate-400"}`}>
                    <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">3</span> Done
                  </div>
                </div>

                <div>{getStatusBadge(selectedOp.status)}</div>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">
                      {selectedOp.type === "RECEIPT" ? "Receive From" : "Delivery Address / Partner"}
                    </span>
                    <span className="font-semibold text-slate-800 text-sm block">
                      {selectedOp.contact || "Azure Interior"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Scheduled Date</span>
                    <span className="font-medium text-slate-800 block">
                      {new Date(selectedOp.scheduleDate).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    {/* Auto-filled responsible user as specified in wireframe */}
                    <span className="text-slate-400 block mb-1">Responsible Staff</span>
                    <span className="font-medium text-slate-800 block">
                      {selectedOp.responsibleName || "Dakshvir Sharma (Logged In)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Operation Type</span>
                    <span className="font-medium text-slate-800 block">{selectedOp.type}</span>
                  </div>
                </div>

                {/* Product Lines Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Line Items
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Product</th>
                          <th className="py-2.5 px-4 text-right">Demanded</th>
                          <th className="py-2.5 px-4 text-right">Done</th>
                          <th className="py-2.5 px-4">Availability</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOp.lines.map((line) => (
                          <tr
                            key={line.id}
                            className={line.isOutOfStock ? "bg-rose-50/70" : "hover:bg-slate-50/50"}
                          >
                            <td className="py-2.5 px-4">
                              <span className="font-semibold text-slate-800">{line.product.name}</span>
                              <span className="text-slate-400 font-mono ml-1.5">[{line.product.sku}]</span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold">
                              {line.qtyDemanded} {line.product.uom}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-600">
                              {line.qtyDone} {line.product.uom}
                            </td>
                            <td className="py-2.5 px-4">
                              {line.isOutOfStock ? (
                                <span className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Out of Stock!
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-medium text-[11px]">Available</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedOp.notes && (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200">
                    <span className="font-semibold text-slate-700 block mb-0.5">Notes:</span>
                    {selectedOp.notes}
                  </div>
                )}
              </div>

              {/* Action Buttons Bar matching Wireframe specs */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                  {selectedOp.status !== "DONE" && selectedOp.status !== "CANCELED" && (
                    <button
                      onClick={() => handleAction(selectedOp.id, "cancel")}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Wireframe spec: 'TODO = when in Draft; on click TODO -> move to Ready' */}
                  {(selectedOp.status === "DRAFT" || selectedOp.status === "WAITING") && (
                    <button
                      onClick={() => handleAction(selectedOp.id, "mark_ready")}
                      disabled={isPending}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                    >
                      TODO (Mark Ready)
                    </button>
                  )}

                  {/* Wireframe spec: 'Validate = when in Ready; on click Validate -> move to Done' */}
                  {selectedOp.status === "READY" && (
                    <button
                      onClick={() => handleAction(selectedOp.id, "validate")}
                      disabled={isPending}
                      className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Validate (Receive/Deliver)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. CREATE OPERATION MODAL */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-base font-bold text-slate-900">Create New Stock Operation</h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOperation} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Operation Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as "RECEIPT" | "DELIVERY" | "INTERNAL")}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="RECEIPT">Receipt (Incoming Goods)</option>
                    <option value="DELIVERY">Delivery Order (Outgoing)</option>
                    <option value="INTERNAL">Internal Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {newType === "RECEIPT" ? "Supplier / Contact" : "Customer / Contact"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="e.g. Azure Interior, Deco Addict"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Product</label>
                    <select
                      value={newProductId}
                      onChange={(e) => setNewProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {allProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.sku}]
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newQty}
                      onChange={(e) => setNewQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Reference order note or delivery instructions..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Create Operation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
