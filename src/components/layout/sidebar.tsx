"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardList,
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

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  admin?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

type NavApp = {
  id: string;
  label: string;
  groups: NavGroup[];
};

const APPS: NavApp[] = [
  {
    id: "time-project-management",
    label: "Time Tracking",
    groups: [
      {
        id: "overview",
        label: "Overview",
        items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
      },
      {
        id: "time-management",
        label: "Time Management",
        items: [
          { href: "/time-entry", label: "Time Entry", icon: Clock3 },
          { href: "/reports", label: "Reports", icon: BarChart3 },
        ],
      },
      {
        id: "administration",
        label: "Administration",
        items: [
          { href: "/clients", label: "Clients & Projects", icon: Building2 },
          { href: "/admin", label: "Administration", icon: Shield, admin: true },
        ],
      },
      {
        id: "system",
        label: "System",
        items: [{ href: "/settings", label: "Settings", icon: Settings }],
      },
    ],
  },
  {
    id: "project-estimates",
    label: "Project Estimates",
    groups: [],
  },
];

const SECTION_STORAGE_KEY = "dss.sidebarSections";

const DEFAULT_OPEN: Record<string, boolean> = {
  "time-project-management": true,
  "project-estimates": true,
  overview: true,
  "time-management": true,
  administration: true,
  system: true,
};

function itemIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function visibleItems(items: NavItem[], role: string) {
  return items.filter((item) => !item.admin || role === "ADMIN");
}

function loadOpenSections(): Record<string, boolean> {
  try {
    const stored = window.localStorage.getItem(SECTION_STORAGE_KEY);
    if (!stored) return { ...DEFAULT_OPEN };
    const parsed = JSON.parse(stored) as Record<string, boolean>;
    return { ...DEFAULT_OPEN, ...parsed };
  } catch {
    return { ...DEFAULT_OPEN };
  }
}

function SectionHeading({
  label,
  expanded,
  onToggle,
  level,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  level: "app" | "group";
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white/10 hover:text-white",
        level === "app"
          ? "text-sm font-semibold text-white"
          : "text-[calc(10px+1pt)] font-semibold tracking-[0.12em] text-white/55 uppercase",
      )}
    >
      <ChevronDown
        className={cn("h-4 w-4 shrink-0 transition-transform duration-150", !expanded && "-rotate-90")}
        aria-hidden
      />
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
    </button>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
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

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(DEFAULT_OPEN);

  useEffect(() => {
    setOpenSections(loadOpenSections());
  }, []);

  useEffect(() => {
    const parents: string[] = [];
    for (const app of APPS) {
      for (const group of app.groups) {
        if (visibleItems(group.items, role).some((item) => itemIsActive(pathname, item.href))) {
          parents.push(app.id, group.id);
        }
      }
    }
    if (parents.length === 0) return;
    setOpenSections((current) => {
      const next = { ...current };
      let changed = false;
      for (const id of parents) {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      }
      if (!changed) return current;
      window.localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [pathname, role]);

  function toggleSection(id: string) {
    setOpenSections((current) => {
      const next = { ...current, [id]: !(current[id] ?? DEFAULT_OPEN[id] ?? true) };
      window.localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const collapsedItems = APPS.flatMap((app) =>
    app.groups.flatMap((group) => visibleItems(group.items, role)),
  );

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
              <p className="truncate text-[calc(11px+1pt)] text-[var(--muted-foreground)]">Time & Project Management</p>
            </div>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {collapsed ? (
          <div className="space-y-1">
            {collapsedItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={itemIsActive(pathname, item.href)}
                collapsed
                onNavigate={onNavigate}
              />
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex cursor-default items-center justify-center rounded-[var(--radius-md)] px-2 py-2 text-[var(--sidebar-foreground)]"
                  aria-label="Project Estimates. No pages yet."
                >
                  <ClipboardList className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Project Estimates — No pages yet</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          APPS.map((app) => {
            const appOpen = openSections[app.id] ?? true;
            return (
              <div key={app.id} className="space-y-1">
                <SectionHeading
                  label={app.label}
                  expanded={appOpen}
                  onToggle={() => toggleSection(app.id)}
                  level="app"
                />
                {appOpen ? (
                  app.groups.length === 0 ? (
                    <p className="px-8 py-1.5 text-[calc(11px+1pt)] text-white/45">No pages yet</p>
                  ) : (
                    <div className="space-y-3 pb-2 pl-2">
                      {app.groups.map((group) => {
                        const items = visibleItems(group.items, role);
                        if (items.length === 0) return null;
                        const groupOpen = openSections[group.id] ?? true;
                        return (
                          <div key={group.id}>
                            <SectionHeading
                              label={group.label}
                              expanded={groupOpen}
                              onToggle={() => toggleSection(group.id)}
                              level="group"
                            />
                            {groupOpen ? (
                              <div className="mt-1 space-y-1">
                                {items.map((item) => (
                                  <NavLink
                                    key={item.href}
                                    item={item}
                                    active={itemIsActive(pathname, item.href)}
                                    collapsed={false}
                                    onNavigate={onNavigate}
                                  />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : null}
              </div>
            );
          })
        )}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className={cn("mb-2 flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2", collapsed && "justify-center px-0")}>
          <Avatar name={userName} />
          {collapsed ? (
            <span className="sr-only">{userName}</span>
          ) : (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-[calc(11px+1pt)] text-white/50">
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
