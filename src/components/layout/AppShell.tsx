"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  History,
  Settings,
  Warehouse,
  Bell,
  Search,
  UserCheck,
  ChevronDown,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [activeWarehouse, setActiveWarehouse] = useState("Main Warehouse (WH)");

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Operations", href: "/operations", icon: ArrowLeftRight },
    { label: "Stock / Products", href: "/products", icon: Boxes },
    { label: "Move History", href: "/history", icon: History },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* 1. Left Sidebar Navigation (Matching Wireframe Spec) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/30">
            S
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-tight block">StockSense</span>
            <span className="text-xs text-indigo-400 font-medium">Odoo IMS 2026</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Warehouse Indicator */}
        <div className="px-4 py-3 mx-3 mb-3 bg-slate-800/80 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <Warehouse className="w-3.5 h-3.5 text-indigo-400" />
            <span>Active Warehouse</span>
          </div>
          <div className="text-xs font-medium text-slate-200 truncate">
            {activeWarehouse}
          </div>
        </div>

        {/* User Profile Footer (Wireframe Spec: Left sidebar corner labeled avatar "A"/"D") */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
              D
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">Dakshvir Sharma</p>
              <p className="text-[11px] text-slate-400 truncate">Inventory Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Inventory Management</span>
            <span className="text-slate-300">/</span>
            <h1 className="text-base font-bold text-slate-800">
              {pathname === "/"
                ? "Executive Dashboard"
                : pathname.startsWith("/operations")
                ? "Warehouse Operations"
                : pathname.startsWith("/products")
                ? "Stock & Product Inventory"
                : pathname.startsWith("/history")
                ? "Stock Move Ledger"
                : "System Settings"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Action Badges */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync (SQLite Engine)
            </div>

            {/* Notifications */}
            <button
              title="Notifications"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
