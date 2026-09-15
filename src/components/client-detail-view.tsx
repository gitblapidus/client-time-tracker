"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Clock3, Layers, Mail, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { currentYearMonth, formatYearMonth } from "@/lib/months";
import { formatHours, formatHoursUnit } from "@/lib/utils";
import { partitionByProjectType } from "@/lib/time-hours";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryCard } from "@/components/ui/summary-card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ActiveStatusSelect } from "@/components/ui/active-status-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSectionRow } from "@/components/ui/table";
import { ClientFormDialog } from "@/components/client-form-dialog";
import { usePageCrumbs } from "@/components/layout/page-crumbs";
import type { ClientRecord } from "@/components/clients-view";
import { ProjectFormDialog, type ProjectRecord } from "@/components/project-form-dialog";

export function ClientDetailView({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const router = useRouter();
  const [client, setClient] = useState<(ClientRecord & { projects: ProjectRecord[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [editClient, setEditClient] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [hoursUsedThisMonth, setHoursUsedThisMonth] = useState<number | null>(null);
  const period = currentYearMonth();
  usePageCrumbs(
    client
      ? [
          { href: "/clients", label: "Clients & Projects" },
          { label: client.name },
        ]
      : null,
  );

  async function load() {
    setLoading(true);
    try {
      const [result, timeResult] = await Promise.all([
        api<{ client: ClientRecord & { projects: ProjectRecord[] } }>(`/api/clients/${clientId}`),
        api<{ rows: Array<{ clientId: string; hoursUsed: number }> }>(
          `/api/time-entries?year=${period.year}&month=${period.month}`,
        ),
      ]);
      setClient(result.client);
      setHoursUsedThisMonth(
        timeResult.rows
          .filter((row) => row.clientId === clientId)
          .reduce((sum, row) => sum + row.hoursUsed, 0),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load client.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function emailFinance() {
    try {
      const result = await api<{ mailto: string }>(`/api/clients/${clientId}/email-finance`, {
        method: "POST",
        body: JSON.stringify({
          startYear: period.year,
          startMonth: period.month,
          endYear: period.year,
          endMonth: period.month,
        }),
      });
      window.location.href = result.mailto;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to prepare finance email.");
    }
  }

  async function updateClientStatus(active: boolean) {
    if (!client || client.active === active) return;
    setUpdatingStatusId(client.id);
    try {
      await api(`/api/clients/${client.id}`, { method: "PATCH", body: JSON.stringify({ active }) });
      toast.success(
        active ? "Client is now active." : "Client is now inactive. All of its projects were marked inactive.",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update client status.");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function updateProjectStatus(project: ProjectRecord, active: boolean) {
    if (project.active === active) return;
    setUpdatingStatusId(project.id);
    try {
      await api(`/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ active }) });
      toast.success(active ? `${project.name} is now active.` : `${project.name} is now inactive.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update project status.");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function deleteClientRecord() {
    try {
      await api(`/api/clients/${clientId}`, { method: "DELETE" });
      toast.success("Client deleted.");
      setDeleteOpen(false);
      router.push("/clients");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete client.");
    }
  }

  if (loading || !client) {
    return (
      <div>
        <div className="mb-5 space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--muted)]" />
          <div className="h-8 w-64 animate-pulse rounded bg-[var(--muted)]" />
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  const groupedProjects = partitionByProjectType(client.projects);
  const projectColSpan = canEdit ? 6 : 5;

  return (
    <div>
      <Link
        href="/clients"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>
      <PageHeader
        title={client.name}
        description={client.financeEmails?.length ? client.financeEmails.join(", ") : "No finance email on file"}
        actions={
          <>
            {(client.financeEmails?.length ?? 0) > 0 ? (
              <Button variant="outline" onClick={emailFinance}>
                <Mail />
                Email Finance
              </Button>
            ) : null}
            {canEdit ? (
              <>
                <Button variant="outline" onClick={() => setEditClient(true)}>
                  <Pencil />
                  Edit Client
                </Button>
                <Button variant="ghost" className="text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" onClick={() => setDeleteOpen(true)}>
                  <Trash2 />
                  Delete
                </Button>
              </>
            ) : null}
          </>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Active Projects"
          value={String(client.projects.filter((project) => project.active).length)}
          icon={Briefcase}
        />
        <SummaryCard
          title="Managed Service Projects"
          value={String(client.projects.filter((project) => project.type === "MANAGED_SERVICE").length)}
          icon={Layers}
        />
        <SummaryCard
          title="Monthly Allocated Hours"
          value={formatHoursUnit(
            client.projects
              .filter((project) => project.type === "MANAGED_SERVICE" && project.active)
              .reduce((sum, project) => sum + (project.monthlyHours ?? 0), 0),
          )}
          icon={Wallet}
        />
        <SummaryCard
          title="Current Month Used"
          value={formatHoursUnit(hoursUsedThisMonth)}
          hint={formatYearMonth(period.year, period.month)}
          icon={Clock3}
        />
      </div>
      <Card className="mb-6 p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Client Executive</p>
            <p className="mt-1 text-lg font-medium text-[var(--foreground)]">{client.executiveName ?? "Not configured"}</p>
            {client.executiveEmail ? (
              <a className="mt-1 inline-block text-sm text-[var(--primary)]" href={`mailto:${client.executiveEmail}`}>
                {client.executiveEmail}
              </a>
            ) : (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">No email on file</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">SPOC</p>
            <p className="mt-1 text-lg font-medium text-[var(--foreground)]">{client.spocName ?? "Not configured"}</p>
            {client.spocEmail ? (
              <a className="mt-1 inline-block text-sm text-[var(--primary)]" href={`mailto:${client.spocEmail}`}>
                {client.spocEmail}
              </a>
            ) : (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">No email on file</p>
            )}
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Client Finance Emails</p>
          {client.financeEmails?.length ? (
            <ul className="mt-1 space-y-1">
              {client.financeEmails.map((email) => (
                <li key={email}>
                  <a className="text-sm font-medium text-[var(--primary)]" href={`mailto:${email}`}>
                    {email}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">Not configured</p>
          )}
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Reporting period ready to send: {formatYearMonth(period.year, period.month)}</p>
          {canEdit ? (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              These addresses are specific to this client. The generic company finance email is in Administration → Finance Settings.
            </p>
          ) : null}
        </div>
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Status</p>
          <div className="mt-2">
            <ActiveStatusSelect
              label={`Status for ${client.name}`}
              value={client.active}
              disabled={!canEdit || updatingStatusId === client.id}
              onChange={updateClientStatus}
            />
          </div>
        </div>
      </Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[var(--text-section)] font-semibold">Projects</h2>
        {canEdit ? (
          <Button onClick={() => { setEditingProject(null); setProjectOpen(true); }}>
            <Plus />
            Add Project
          </Button>
        ) : null}
      </div>
      <Card className="overflow-hidden">
        {client.projects.length === 0 ? (
          <EmptyState
            title="No projects"
            description="Add a project to begin tracking time."
            action={
              canEdit ? (
                <Button onClick={() => { setEditingProject(null); setProjectOpen(true); }}>
                  <Plus />
                  Add Project
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Project Manager</TableHead>
                <TableHead className="text-right">Monthly Hours</TableHead>
                <TableHead className="text-right">Max Carryover</TableHead>
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedProjects.managed.length > 0 ? (
                <>
                  <TableSectionRow colSpan={projectColSpan}>Managed Service ({groupedProjects.managed.length})</TableSectionRow>
                  {groupedProjects.managed.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.productionManager ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHours(project.monthlyHours)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHours(project.maximumCarryoverHours)}</TableCell>
                      <TableCell>
                        <ActiveStatusSelect
                          label={`Status for ${project.name}`}
                          value={project.active}
                          disabled={!canEdit || updatingStatusId === project.id}
                          onChange={(active) => updateProjectStatus(project, active)}
                        />
                      </TableCell>
                      {canEdit ? (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingProject(project); setProjectOpen(true); }}>
                            Edit
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </>
              ) : null}
              {groupedProjects.timeAndMaterials.length > 0 ? (
                <>
                  <TableSectionRow colSpan={projectColSpan}>Time & Materials ({groupedProjects.timeAndMaterials.length})</TableSectionRow>
                  {groupedProjects.timeAndMaterials.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.productionManager ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHours(project.monthlyHours)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHours(project.maximumCarryoverHours)}</TableCell>
                      <TableCell>
                        <ActiveStatusSelect
                          label={`Status for ${project.name}`}
                          value={project.active}
                          disabled={!canEdit || updatingStatusId === project.id}
                          onChange={(active) => updateProjectStatus(project, active)}
                        />
                      </TableCell>
                      {canEdit ? (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingProject(project); setProjectOpen(true); }}>
                            Edit
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </>
              ) : null}
            </TableBody>
          </Table>
        )}
      </Card>
      <ClientFormDialog open={editClient} onOpenChange={setEditClient} client={client} onSaved={load} />
      <ProjectFormDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        clients={[{ id: client.id, name: client.name }]}
        defaultClientId={client.id}
        project={editingProject}
        onSaved={load}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${client.name}?`}
        description="This permanently deletes the client, its projects, and all related time entries. This cannot be undone."
        confirmLabel="Delete client"
        danger
        requireTypedValue="DELETE"
        onConfirm={deleteClientRecord}
      />
    </div>
  );
}
