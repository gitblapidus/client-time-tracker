"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  INTEGRATION_DIRECTIONS,
  INTEGRATION_FORMATS,
  INTEGRATION_MODES,
  INTEGRATION_TYPES,
} from "@/lib/integration-inventory";
import { appendQueryValues } from "@/lib/query-params";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterMultiSelect } from "@/components/ui/filter-multi-select";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSectionRow } from "@/components/ui/table";
import { IntegrationInventoryFormDialog } from "@/components/integration/integration-inventory-form-dialog";

export type IntegrationInventoryRecord = {
  id: string;
  referenceId: string;
  name: string;
  description: string | null;
  mvp: boolean;
  type: string;
  direction: string;
  mode: string;
  format: string;
  dataSource: string | null;
  dataTarget: string | null;
  responsible: string | null;
  pillar: string | null;
  createdAt: string;
  updatedAt: string;
};

export function IntegrationInventoryView({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<IntegrationInventoryRecord[]>([]);
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [pillars, setPillars] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [mvp, setMvp] = useState<string[]>([]);
  const [direction, setDirection] = useState<string[]>([]);
  const [mode, setMode] = useState<string[]>([]);
  const [format, setFormat] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IntegrationInventoryRecord | null>(null);
  const [deleting, setDeleting] = useState<IntegrationInventoryRecord | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      appendQueryValues(params, "mvp", mvp);
      appendQueryValues(params, "type", types);
      appendQueryValues(params, "direction", direction);
      appendQueryValues(params, "mode", mode);
      appendQueryValues(params, "format", format);
      const result = await api<{
        items: IntegrationInventoryRecord[];
        options: { responsibles: string[]; pillars: string[] };
      }>(`/api/integration/inventory?${params.toString()}`);
      setItems(result.items);
      setResponsibles(result.options.responsibles);
      setPillars(result.options.pillars);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load integrations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(load, 200);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, types, mvp, direction, mode, format]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api(`/api/integration/inventory/${deleting.id}`, { method: "DELETE" });
      toast.success("Integration deleted.");
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete integration.");
    }
  }

  const hasFilters = Boolean(search || types.length || mvp.length || direction.length || mode.length || format.length);
  const groupedItems = INTEGRATION_TYPES.filter((type) => types.length === 0 || types.includes(type)).map((type) => ({
    type,
    items: items.filter((item) => item.type === type),
  }));
  const rowColSpan = 2;

  return (
    <div>
      <PageHeader
        title="Inventory of Integrations"
        description="Track Intershop integrations, direction, mode, and ownership."
        actions={
          canEdit ? (
            <Button onClick={openCreate}>
              <Plus />
              New Integration
            </Button>
          ) : null
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              placeholder="Search reference ID or integrations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <FilterMultiSelect
              ariaLabel="Filter by type"
              placeholder="All types"
              countNoun="types"
              value={types}
              onChange={setTypes}
              options={INTEGRATION_TYPES.map((option) => ({ value: option, label: option }))}
            />
            <FilterMultiSelect
              ariaLabel="Filter by MVP"
              placeholder="All MVP"
              countNoun="MVP"
              value={mvp}
              onChange={setMvp}
              options={[
                { value: "true", label: "Y" },
                { value: "false", label: "N" },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <FilterMultiSelect
              ariaLabel="Filter by direction"
              placeholder="All directions"
              countNoun="directions"
              value={direction}
              onChange={setDirection}
              options={INTEGRATION_DIRECTIONS.map((option) => ({ value: option, label: option }))}
            />
            <FilterMultiSelect
              ariaLabel="Filter by mode"
              placeholder="All modes"
              countNoun="modes"
              value={mode}
              onChange={setMode}
              options={INTEGRATION_MODES.map((option) => ({ value: option, label: option }))}
            />
            <FilterMultiSelect
              ariaLabel="Filter by format"
              placeholder="All formats"
              countNoun="formats"
              value={format}
              onChange={setFormat}
              options={INTEGRATION_FORMATS.map((option) => ({ value: option, label: option }))}
            />
          </div>
        </div>
        {loading ? (
          <TableSkeleton cols={4} />
        ) : items.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No integrations found" : "No integrations yet"}
            description={
              hasFilters
                ? "Try another search or filter, or add an integration to get started."
                : "Create the first integration to start the inventory."
            }
            action={
              canEdit ? (
                <Button onClick={openCreate}>
                  <Plus />
                  New Integration
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-full">
                  <div className={INVENTORY_DETAIL_GRID}>
                    <span>Reference ID</span>
                    <span>Integration</span>
                    <span className="col-span-6">Description</span>
                  </div>
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y-0">
              {groupedItems.map((group) => (
                <Fragment key={group.type}>
                  <TableSectionRow colSpan={rowColSpan}>
                    {group.type} ({group.items.length})
                  </TableSectionRow>
                  {group.items.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={rowColSpan} className="text-sm text-[var(--muted-foreground)]">
                        No integrations in this group.
                      </TableCell>
                    </TableRow>
                  ) : (
                    group.items.map((item) => (
                      <Fragment key={item.id}>
                        <TableRow className="border-t border-[var(--border)] [&>td]:align-top [&>td]:pb-1">
                          <TableCell className="align-top">
                            <div className={INVENTORY_DETAIL_GRID}>
                              <div className="font-medium whitespace-nowrap">{item.referenceId}</div>
                              <div className="font-medium whitespace-nowrap">{item.name}</div>
                              <div className="col-span-6 min-w-0 text-sm text-[var(--muted-foreground)]">
                                {item.description ?? "—"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell rowSpan={2} className="align-top text-right">
                            <div className="flex flex-col items-end gap-1">
                              {canEdit ? (
                                <div className="whitespace-nowrap">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditing(item);
                                      setFormOpen(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                                    onClick={() => setDeleting(item)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              ) : null}
                              {INVENTORY_ITEM_LINKS.map((link) => (
                                <Link
                                  key={link.href}
                                  href={`/integration/inventory/${item.id}/${link.href}`}
                                  className="text-xs font-medium text-[var(--primary)] hover:underline"
                                >
                                  {link.label}
                                </Link>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-[var(--surface-muted)]">
                          <TableCell className="pt-4 pb-3">
                            <div className={INVENTORY_DETAIL_GRID}>
                              <InventoryDetail label="MVP" value={item.mvp ? "Y" : "N"} />
                              <InventoryDetail label="Direction" value={item.direction} />
                              <InventoryDetail label="Mode" value={item.mode} />
                              <InventoryDetail label="Format" value={item.format} />
                              <InventoryDetail label="Data Source" value={item.dataSource} />
                              <InventoryDetail label="Data Target" value={item.dataTarget} />
                              <InventoryDetail label="Responsible" value={item.responsible} />
                              <InventoryDetail label="Pillar" value={item.pillar} />
                            </div>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    ))
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <IntegrationInventoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        responsibles={responsibles}
        pillars={pillars}
        onSaved={load}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete integration?"
        description={
          deleting
            ? `This permanently deletes ${deleting.referenceId} ${deleting.name} from the inventory.`
            : "This permanently deletes the integration from the inventory."
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

const INVENTORY_DETAIL_GRID = "grid grid-cols-8 gap-x-6";
const INVENTORY_ITEM_LINKS = [
  { href: "details", label: "Details" },
  { href: "mapping", label: "Mapping" },
  { href: "sample", label: "Sample" },
] as const;

function InventoryDetail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[calc(11px+1pt)] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className="mt-0.5 text-sm">{value?.trim() ? value : "—"}</div>
    </div>
  );
}
