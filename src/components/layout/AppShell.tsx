"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  History,
  Settings,
  Warehouse,
  Bell,
  LogIn,
  LogOut,
  UserCheck,
  ChevronUp,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeWarehouse] = useState("Main Warehouse (WH)");
  const [user, setUser] = useState<{
    id: string;
    name: string;
    loginId: string;
    email: string;
    role: string;
  }>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("stocksense_user");
        if (stored) return JSON.parse(stored);
      } catch {
        // Fallback
      }
    }
    return {
      id: "default-user",
      name: "Dakshvir Sharma",
      loginId: "dakshvir",
      email: "dakshvirsharma2008@gmail.com",
      role: "MANAGER",
    };
  });
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("stocksense_user");
    setUser({
      id: "default-user",
      name: "Dakshvir Sharma",
      loginId: "dakshvir",
      email: "dakshvirsharma2008@gmail.com",
      role: "MANAGER",
    });
    router.push("/login");
  };

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
        <div className="p-3 border-t border-slate-800 relative">
          {showUserMenu && (
            <div className="absolute bottom-16 left-3 right-3 bg-slate-800 border border-slate-700 rounded-xl p-2 shadow-2xl text-xs space-y-1 z-50">
              <div className="p-2 border-b border-slate-700/60 mb-1">
                <p className="font-bold text-slate-100 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[9px] font-bold">
                  {user.role}
                </span>
              </div>
              <Link
                href="/login"
                className="flex items-center gap-2 px-2 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-400" /> Switch / Sign In
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-2 px-2 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Register Account
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center justify-between p-1.5 hover:bg-slate-800/80 rounded-lg transition-colors text-left group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.role === "MANAGER" ? "Inventory Manager" : "Warehouse Staff"}
                </p>
              </div>
            </div>
            <ChevronUp className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
          </button>
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
