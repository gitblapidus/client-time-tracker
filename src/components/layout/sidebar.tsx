"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Clock3,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { BrandLogo } from "@/components/brand-logo";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Time Management",
    items: [
      { href: "/time-entry", label: "Time Entry", icon: Clock3 },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/clients", label: "Clients & Projects", icon: Building2 },
      { href: "/admin", label: "Administration", icon: Shield, admin: true },
    ],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar({
  collapsed,
  role,
  userName,
  userRole,
  onNavigate,
}: {
  collapsed: boolean;
  role: string;
  userName: string;
  userRole: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      <div className={cn("border-b border-white/10 px-3 py-4", collapsed && "px-2")}>
        {collapsed ? (
          <div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-white">
            <BrandLogo size="sm" />
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-white px-3 py-2.5">
            <BrandLogo size="sm" className="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">DSS Partners</p>
              <p className="truncate text-[11px] text-[var(--muted-foreground)]">Time & Project Management</p>
            </div>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.admin || role === "ADMIN");
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              {collapsed ? null : (
                <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.12em] text-white/40 uppercase">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  const link = (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-150",
                        active ? "bg-[var(--sidebar-active)] text-white" : "hover:bg-white/10 hover:text-white",
                        collapsed && "justify-center px-2",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed ? item.label : <span className="sr-only">{item.label}</span>}
                    </Link>
                  );
                  if (!collapsed) return <div key={item.href}>{link}</div>;
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className={cn("mb-2 flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2", collapsed && "justify-center px-0")}>
          <Avatar name={userName} />
          {collapsed ? (
            <span className="sr-only">{userName}</span>
          ) : (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-[11px] text-white/50">
                {userRole === "ADMIN" ? "Administrator" : "User"}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--sidebar-foreground)] hover:bg-white/10 hover:text-white",
            collapsed && "justify-center px-2",
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed ? "Logout" : <span className="sr-only">Logout</span>}
        </button>
      </div>
    </div>
  );
}
