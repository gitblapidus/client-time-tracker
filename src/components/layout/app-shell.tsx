"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { PageCrumbsProvider, useResolvedCrumbs } from "@/components/layout/page-crumbs";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

const TITLES: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/time-entry", label: "Time Entry" },
  { href: "/clients", label: "Clients & Projects" },
  { href: "/integration/clients", label: "Clients" },
  { href: "/integration/inventory", label: "Inventory of Integrations" },
  { href: "/admin", label: "Administration" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; role: string; username?: string | null };
  children: React.ReactNode;
}) {
  return (
    <PageCrumbsProvider>
      <AppShellFrame user={user}>{children}</AppShellFrame>
    </PageCrumbsProvider>
  );
}

function AppShellFrame({
  user,
  children,
}: {
  user: { name?: string | null; role: string; username?: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("dss.sidebarCollapsed");
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("dss.sidebarCollapsed", String(next));
      return next;
    });
  }

  const fallbackCrumbs = useMemo(() => {
    const match = TITLES.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    if (!match) {
      return [{ label: "DSS Partners" }];
    }
    if (match.href === "/clients" && pathname !== "/clients") {
      return [
        { href: "/clients", label: "Clients & Projects" },
        { label: "Client" },
      ];
    }
    if (match.href === "/integration/clients" && pathname !== "/integration/clients") {
      return [
        { href: "/integration/clients", label: "Clients" },
        { label: "Client" },
      ];
    }
    if (match.href === "/integration/inventory" && pathname !== "/integration/inventory") {
      const page = pathname.endsWith("/mapping")
        ? "Mapping"
        : pathname.endsWith("/sample")
          ? "Sample"
          : "Integration Details";
      return [
        { href: "/integration/inventory", label: "Inventory of Integrations" },
        { label: page },
      ];
    }
    return [{ label: match.label }];
  }, [pathname]);
  const crumbs = useResolvedCrumbs(fallbackCrumbs);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 md:block",
          collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]",
        )}
      >
        <Sidebar collapsed={collapsed} role={user.role} userName={user.name ?? "User"} userRole={user.role} />
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--foreground)]/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[var(--sidebar-width)] shadow-xl">
            <Sidebar
              collapsed={false}
              role={user.role}
              userName={user.name ?? "User"}
              userRole={user.role}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200",
          collapsed ? "md:pl-[var(--sidebar-collapsed)]" : "md:pl-[var(--sidebar-width)]",
        )}
      >
        <Header
          crumbs={crumbs}
          userName={user.name ?? "User"}
          userRole={user.role}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-[var(--content-max)] px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
