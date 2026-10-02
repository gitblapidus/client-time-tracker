"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { appendQueryValues } from "@/lib/query-params";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterMultiSelect } from "@/components/ui/filter-multi-select";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActiveStatusSelect } from "@/components/ui/active-status-select";
import { IntegrationClientFormDialog } from "@/components/integration/integration-client-form-dialog";

export type IntegrationProjectRecord = {
  id: string;
  clientId: string;
  name: string;
  productionManager: string | null;
  active: boolean;
};

export type IntegrationClientRecord = {
  id: string;
  name: string;
  executiveName: string | null;
  executiveEmail: string | null;
  executivePhone: string | null;
  spocName: string | null;
  spocEmail: string | null;
  spocPhone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { projects: number };
  projects?: IntegrationProjectRecord[];
};

export function IntegrationClientsView({ canEdit }: { canEdit: boolean }) {
  const [clients, setClients] = useState<IntegrationClientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      appendQueryValues(params, "active", status);
      const result = await api<{ clients: IntegrationClientRecord[] }>(
        `/api/integration/clients?${params.toString()}`,
      );
      setClients(result.clients);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load clients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(load, 200);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const filtered = useMemo(() => clients, [clients]);

  async function updateClientStatus(client: IntegrationClientRecord, active: boolean) {
    if (client.active === active) return;
    setUpdatingClientId(client.id);
    try {
      await api(`/api/integration/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      toast.success(
        active
          ? `${client.name} is now active.`
          : `${client.name} is now inactive. All of its projects were marked inactive.`,
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update client status.");
    } finally {
      setUpdatingClientId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Manage Integration Spec clients and projects."
        actions={
          canEdit ? (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              New Client
            </Button>
          ) : null
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Search clients..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <FilterMultiSelect
            ariaLabel="Filter by status"
            placeholder="All statuses"
            countNoun="statuses"
            value={status}
            onChange={setStatus}
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </div>
        {loading ? (
          <TableSkeleton cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search || status.length > 0 ? "No clients found" : "No clients yet"}
            description={
              search || status.length > 0
                ? "Try another search, or add a client to get started."
                : "Create your first client to begin Integration Spec work."
            }
            action={
              canEdit ? (
                <Button onClick={() => setOpen(true)}>
                  <Plus />
                  Create Client
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Client Executive</TableHead>
                <TableHead>SPOC</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link
                      href={`/integration/clients/${client.id}`}
                      className="font-medium text-[var(--primary)] hover:underline"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{client.executiveName ?? "—"}</div>
                    {client.executiveEmail ? (
                      <a
                        className="block text-sm text-[var(--primary)] hover:underline"
                        href={`mailto:${client.executiveEmail}`}
                      >
                        {client.executiveEmail}
                      </a>
                    ) : null}
                    {client.executivePhone ? (
                      <a
                        className="block text-sm text-[var(--primary)] hover:underline"
                        href={`tel:${client.executivePhone}`}
                      >
                        {client.executivePhone}
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div>{client.spocName ?? "—"}</div>
                    {client.spocEmail ? (
                      <a
                        className="block text-sm text-[var(--primary)] hover:underline"
                        href={`mailto:${client.spocEmail}`}
                      >
                        {client.spocEmail}
                      </a>
                    ) : null}
                    {client.spocPhone ? (
                      <a className="block text-sm text-[var(--primary)] hover:underline" href={`tel:${client.spocPhone}`}>
                        {client.spocPhone}
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <ActiveStatusSelect
                      label={`Status for ${client.name}`}
                      value={client.active}
                      disabled={!canEdit || updatingClientId === client.id}
                      onChange={(active) => updateClientStatus(client, active)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <IntegrationClientFormDialog open={open} onOpenChange={setOpen} onSaved={load} />
    </div>
  );
}
