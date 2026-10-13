"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ChefHat, 
  Bike, 
  Users, 
  ClipboardList, 
  Package, 
  Wallet,
  Settings,
  LogOut,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS Terminal", icon: UtensilsCrossed },
  { href: "/kds", label: "Kitchen (KDS)", icon: ChefHat },
  { href: "/delivery", label: "Delivery", icon: Bike },
  { href: "/admin/billing", label: "Billing / Cashier", icon: Receipt },
  { href: "/admin/orders", label: "Sales & Orders", icon: ClipboardList },
  { href: "/admin/inventory", label: "Menu Management", icon: Package },
  { href: "/admin/stock", label: "Stock & Inventory", icon: ClipboardList },
  { href: "/admin/finance", label: "Accounting & Finance", icon: Wallet },
  { href: "/admin/hr", label: "Staff & HR", icon: Users },
  { href: "/admin/tables", label: "Tables & Floors", icon: LayoutDashboard },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success) setProfile(data.user);
      })
      .catch(console.error);
  }, []);
  
  // Hide sidebar on POS, KDS, Delivery, and all login pages
  const isFullScreenApp = ["/pos", "/kds", "/delivery", "/login", "/superadmin"].some(path => pathname?.startsWith(path));
  
  if (isFullScreenApp || pathname === "/") return null;

  return (
    <aside className="w-64 flex-shrink-0 bg-surface-2 border-r border-border min-h-screen flex flex-col">
      <div className="p-6 border-b border-border flex items-center gap-3">
        {profile?.restaurant?.logoUrl ? (
          <img src={profile.restaurant.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-bold text-sm">
            {profile?.restaurant?.name?.charAt(0) || "R"}
          </div>
        )}
        <div className="overflow-hidden">
          <h1 className="font-bold text-foreground leading-tight tracking-tight truncate max-w-[150px]">
            {profile?.restaurant?.name || "RestroERP"}
          </h1>
          <p className="text-[10px] text-muted uppercase font-semibold tracking-wider">Enterprise</p>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-4 overflow-y-auto flex flex-col gap-1">
        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">Menu</div>
        {NAV_ITEMS.filter(item => {
          if (!profile) return false;
          const { role, restaurant } = profile;

          // 1. Feature Toggles Check (SuperAdmin overrides)
          if (item.href === "/admin/hr" && restaurant?.hasHR === false) return false;
          if (item.href === "/kds" && restaurant?.hasKDS === false) return false;
          if (item.href === "/admin/inventory" && restaurant?.hasInventory === false) return false;
          if (item.href === "/admin/stock" && restaurant?.hasInventory === false) return false;
          if (item.href === "/delivery" && restaurant?.hasDelivery === false) return false;
          if (item.href === "/admin/tables" && restaurant?.hasTables === false) return false;

          // 2. Role-Based Permissions
          if (role === "OWNER" || role === "SUPER_ADMIN") return true;
          if (role === "MANAGER") {
             // Managers see most things except Accounting/Settings by default
             if (["/admin/finance", "/admin/settings"].includes(item.href)) return false;
             return true;
          }
          if (role === "HR" && item.href === "/admin/hr") return true;
          if (role === "ACCOUNTANT" && item.href === "/admin/finance") return true;
          if (role === "CASHIER" && ["/admin/orders", "/pos", "/delivery", "/admin/billing"].includes(item.href)) return true;
          
          if (item.href === "/admin") return true; // Everyone sees Dashboard
          return false;
        }).map((item) => {
          const isActive = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== "/admin");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-link",
                isActive && "active"
              )}
            >
              <item.icon size={18} className={isActive ? "text-primary" : ""} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-foreground font-semibold">
            {profile?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{profile?.name || "Loading..."}</p>
            <p className="text-[10px] text-muted truncate uppercase">{profile?.role?.replace("_", " ")}</p>
          </div>
        </div>
        
        <div className="mt-2 text-center text-[10px] text-muted opacity-50 font-medium py-2">
          Powered by Lincoz Tech
        </div>

        <button 
          onClick={() => { document.cookie = "restro_token=; path=/; max-age=0"; window.location.href = "/login"; }}
          className="w-full sidebar-link text-danger hover:bg-danger-muted hover:text-danger mt-2"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
