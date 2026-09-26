"use client";

import React, { useState, useTransition } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Edit3,
  X,
  TrendingDown,
} from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  uom: string;
  perUnitCost: number;
  minStock: number;
  onHand: number;
  reserved: number;
  freeToUse: number;
  isLowStock: boolean;
  stockLevels: Array<{
    locationId: string;
    locationName: string;
    locationCode: string;
    onHand: number;
    reserved: number;
    freeToUse: number;
  }>;
}

export interface ProductsClientProps {
  initialProducts: ProductItem[];
}

export default function ProductsClient({ initialProducts }: ProductsClientProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modals
  const [adjustingProduct, setAdjustingProduct] = useState<ProductItem | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("Cycle Count Physical Verification");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newCategory, setNewCategory] = useState("Furniture");
  const [newUom, setNewUom] = useState("Units");
  const [newCost, setNewCost] = useState(1000);
  const [newMinStock, setNewMinStock] = useState(10);
  const [newInitialStock, setNewInitialStock] = useState(20);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (selectedCategory !== "ALL") params.append("category", selectedCategory);
      if (lowStockFilter) params.append("lowStock", "true");

      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load products");
      setProducts(json.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    // Use default location or first stock level
    const locationId = adjustingProduct.stockLevels[0]?.locationId;
    if (!locationId) {
      alert("No storage location associated with this product");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: adjustingProduct.id,
            locationId,
            newOnHand: Number(newStockQty),
            reason: adjustReason,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Stock update failed");

        setAdjustingProduct(null);
        await loadProducts();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to update stock");
      }
    });
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            sku: newSku.toUpperCase(),
            category: newCategory,
            uom: newUom,
            perUnitCost: Number(newCost),
            minStock: Number(newMinStock),
            initialStock: Number(newInitialStock),
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to create product");

        setIsCreateOpen(false);
        setNewName("");
        setNewSku("");
        await loadProducts();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Product creation failed");
      }
    });
  };

  const categories = ["ALL", "Furniture", "Raw Materials", "Components", "Hardware", "Packaging", "Electronics"];

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Stock & Product Catalog</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Live stock levels, reorder thresholds, and direct warehouse stock adjustment controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadProducts}
              disabled={isLoading}
              className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Product
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
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
                onKeyDown={(e) => e.key === "Enter" && loadProducts()}
                placeholder="Search SKU or name..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Quick Toggle for Low Stock */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                lowStockFilter
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Low Stock Only ({products.filter((p) => p.isLowStock).length})
            </button>
            <span className="text-slate-400 font-medium">
              Showing {products.length} catalog items
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Stock Table (Matching Wireframe Screen 3 Spec) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5">Product</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5 text-right">Per Unit Cost</th>
                  <th className="py-3 px-5 text-right">On Hand</th>
                  <th className="py-3 px-5 text-right">Free to Use</th>
                  <th className="py-3 px-5">Stock Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Loading stock inventory...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            <Boxes className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block text-xs">{p.name}</span>
                            <span className="text-[11px] font-mono text-slate-400 block">{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-semibold text-slate-800 text-xs">
                        ₹{p.perUnitCost.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900 text-xs">
                        {p.onHand} {p.uom}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-indigo-600 text-xs">
                        {p.freeToUse} {p.uom}
                      </td>
                      <td className="py-3.5 px-5">
                        {p.freeToUse <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            <TrendingDown className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : p.isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Low Stock ({p.freeToUse}/{p.minStock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {/* Wireframe spec: "User must be able to update the stock from here" */}
                        <button
                          onClick={() => {
                            setAdjustingProduct(p);
                            setNewStockQty(p.onHand);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                        >
                          <Edit3 className="w-3 h-3" /> Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 1. STOCK ADJUSTMENT MODAL (Wireframe Spec: Update stock directly from here) */}
        {adjustingProduct && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Adjust Physical Stock</h3>
                  <p className="text-xs text-slate-500">
                    {adjustingProduct.name} [{adjustingProduct.sku}]
                  </p>
                </div>
                <button
                  onClick={() => setAdjustingProduct(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdjustStock} className="p-5 space-y-4 text-xs">
                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block">Current Recorded On Hand:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {adjustingProduct.onHand} {adjustingProduct.uom}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Free to Use:</span>
                    <span className="font-bold text-indigo-600 text-sm">
                      {adjustingProduct.freeToUse} {adjustingProduct.uom}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    New Physical Counted Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newStockQty}
                    onChange={(e) => setNewStockQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Adjustment Delta: {newStockQty - adjustingProduct.onHand >= 0 ? "+" : ""}
                    {newStockQty - adjustingProduct.onHand} {adjustingProduct.uom}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Adjustment Reason</label>
                  <input
                    type="text"
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Physical inventory count, damaged item write-off"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustingProduct(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Confirm & Log in Ledger
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. CREATE PRODUCT MODAL */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-base font-bold text-slate-900">Add New Product</h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ergonomic Office Desk"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">SKU / Code</label>
                    <input
                      type="text"
                      required
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      placeholder="e.g. DSK-900"
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg uppercase font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {categories.filter((c) => c !== "ALL").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">UoM</label>
                    <select
                      value={newUom}
                      onChange={(e) => setNewUom(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Units">Units</option>
                      <option value="kg">kg</option>
                      <option value="Meters">Meters</option>
                      <option value="Boxes">Boxes</option>
                      <option value="Rolls">Rolls</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Per Unit Cost (₹)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newCost}
                      onChange={(e) => setNewCost(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Min Reorder</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newMinStock}
                      onChange={(e) => setNewMinStock(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Initial Stock</label>
                    <input
                      type="number"
                      min={0}
                      value={newInitialStock}
                      onChange={(e) => setNewInitialStock(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
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
                    disabled={isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Save Product
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
