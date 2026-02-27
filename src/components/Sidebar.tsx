"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Network, 
  Globe2, 
  ShieldAlert, 
  Settings, 
  ChevronRight,
  LogOut,
  Bell
} from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: true },
    { icon: Network, label: "Threat Graph", href: "#", active: false },
    { icon: Globe2, label: "Global Map", href: "#", active: false },
    { icon: ShieldAlert, label: "Alerts", href: "#", active: false },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? "64px" : "240px" }}
      className="h-screen shrink-0 border-r border-white/[0.04] bg-[#060a13]/95 backdrop-blur-xl flex flex-col z-50 relative transition-all duration-300 ease-in-out"
    >
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 bg-[#060a13] border border-white/[0.08] rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors z-50"
      >
        <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`} />
      </button>

      {/* Logo Area */}
      <div className="h-14 flex items-center px-4 border-b border-white/[0.04] shrink-0 overflow-hidden">
        <div className="flex items-center gap-3 w-full">
          <div className="relative shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="absolute inset-0 blur-sm bg-red-500/20 rounded-lg" />
            <ShieldAlert className="h-4 w-4 text-red-500 relative z-10" />
          </div>
          {!collapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[15px] font-bold tracking-tight text-white whitespace-nowrap"
            >
              ARGUS
            </motion.span>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
              item.active 
                ? "bg-white/[0.08] text-white" 
                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
            }`}
          >
            {item.active && (
              <motion.div 
                layoutId="activeTab"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-red-500 rounded-r-full shadow-[0_0_8px_rgba(239,68,68,0.6)]" 
              />
            )}
            <item.icon className={`h-4 w-4 shrink-0 transition-colors ${item.active ? "text-red-400" : "group-hover:text-slate-300"}`} />
            {!collapsed && (
              <span className="text-sm font-medium whitespace-nowrap">
                {item.label}
              </span>
            )}
            
            {/* Tooltip for collapsed state */}
            {collapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-xs text-white rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-white/[0.04] flex flex-col gap-2">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-colors group relative">
          <Settings className="h-4 w-4 shrink-0 group-hover:text-slate-300" />
          {!collapsed && <span className="text-sm font-medium whitespace-nowrap">Settings</span>}
        </button>
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors group relative">
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm font-medium whitespace-nowrap">Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
