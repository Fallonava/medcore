"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Shield, 
  Zap,
  Bot,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export function BottomNav() {
  const pathname = usePathname();
  const { canRead, isSuperAdmin } = useAuth();

  const navItems = [
    { name: "Beranda", href: "/", icon: LayoutDashboard, resource: "dashboard" },
    { name: "Jadwal", href: "/schedules", icon: Calendar, resource: "schedules" },
    { name: "Otomatisasi", href: "/automation", icon: Bot, isCenter: true, resource: "automation" },
    { name: "Dokter", href: "/doctors", icon: Users, resource: "doctors" },
    { name: "Menu", href: "#", icon: Menu, isMenu: true, resource: null },
  ];

  const filterByPermission = (items: any[]) => {
    if (isSuperAdmin) return items;
    return items.filter((item) => !item.resource || canRead(item.resource));
  };

  const visibleItems = filterByPermission(navItems);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-mobile-menu'));
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 pointer-events-none">
      <div className="max-w-md mx-auto relative pointer-events-auto">
        {/* Background Glass Plate */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-black/5" />
        
        <nav className="relative flex items-center justify-between px-2 h-16">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            if (item.isCenter) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="relative -top-6 flex items-center justify-center"
                >
                  <div className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg",
                    isActive 
                      ? "btn-gradient text-white shadow-blue-500/40 translate-y-[-4px]" 
                      : "bg-slate-900 text-white shadow-slate-900/30 hover:scale-110 active:scale-95"
                  )}>
                    <Icon size={28} className={cn(isActive && "animate-pulse")} />
                  </div>
                  <span className="absolute -bottom-6 text-[10px] font-bold text-slate-900 uppercase tracking-tighter">
                    {item.name}
                  </span>
                </Link>
              );
            }

            const content = (
              <>
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  isActive ? "bg-blue-600/10 text-blue-600" : "text-slate-400"
                )}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[10px] font-bold mt-0.5 transition-all duration-300",
                  isActive ? "text-blue-600" : "text-slate-400"
                )}>
                  {item.name}
                </span>
              </>
            );

            if (item.isMenu) {
              return (
                <button
                  key={item.name}
                  onClick={handleMenuClick}
                  className="flex flex-col items-center justify-center flex-1 transition-all active:scale-90 outline-none"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 transition-all active:scale-90"
              >
                {content}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
