"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ActiveStatusSelect } from "@/components/ui/active-status-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePageCrumbs } from "@/components/layout/page-crumbs";
import {
  type IntegrationClientRecord,
  type IntegrationProjectRecord,
} from "@/components/integration/integration-clients-view";
import { IntegrationClientFormDialog } from "@/components/integration/integration-client-form-dialog";
import { IntegrationProjectFormDialog } from "@/components/integration/integration-project-form-dialog";

export function IntegrationClientDetailView({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const router = useRouter();
  const [client, setClient] = useState<(IntegrationClientRecord & { projects: IntegrationProjectRecord[] }) | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [editClient, setEditClient] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<IntegrationProjectRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  usePageCrumbs(
    client
      ? [
          { href: "/integration/clients", label: "Clients" },
          { label: client.name },
        ]
      : null,
  );

  async function load() {
    setLoading(true);
    try {
      const result = await api<{ client: IntegrationClientRecord & { projects: IntegrationProjectRecord[] } }>(
        `/api/integration/clients/${clientId}`,
      );
      setClient(result.client);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load client.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function updateClientStatus(active: boolean) {
    if (!client || client.active === active) return;
    setUpdatingStatusId(client.id);
    try {
      await api(`/api/integration/clients/${client.id}`, { method: "PATCH", body: JSON.stringify({ active }) });
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

  async function updateProjectStatus(project: IntegrationProjectRecord, active: boolean) {
    if (project.active === active) return;
    setUpdatingStatusId(project.id);
    try {
      await api(`/api/integration/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ active }) });
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
      await api(`/api/integration/clients/${clientId}`, { method: "DELETE" });
      toast.success("Client deleted.");
      setDeleteOpen(false);
      router.push("/integration/clients");
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
        <TableSkeleton rows={4} cols={3} />
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/integration/clients"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>
      <PageHeader
        title={client.name}
        actions={
          canEdit ? (
            <>
              <Button variant="outline" onClick={() => setEditClient(true)}>
                <Pencil />
                Edit Client
              </Button>
              <Button
                variant="ghost"
                className="text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 />
                Delete
              </Button>
            </>
          ) : null
        }
      />
      <Card className="mb-6 p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Client Executive
            </p>
            <p className="mt-1 text-lg font-medium text-[var(--foreground)]">
              {client.executiveName ?? "Not configured"}
            </p>
            {client.executiveEmail ? (
              <a className="mt-1 inline-block text-sm text-[var(--primary)]" href={`mailto:${client.executiveEmail}`}>
                {client.executiveEmail}
              </a>
            ) : (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">No email on file</p>
            )}
            {client.executivePhone ? (
              <a className="mt-1 block text-sm text-[var(--primary)]" href={`tel:${client.executivePhone}`}>
                {client.executivePhone}
              </a>
            ) : (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">No phone on file</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">SPOC</p>
            <p className="mt-1 text-lg font-medium text-[var(--foreground)]">
              {client.spocName ?? "Not configured"}
            </p>
            {client.spocEmail ? (
              <a className="mt-1 inline-block text-sm text-[var(--primary)]" href={`mailto:${client.spocEmail}`}>
                {client.spocEmail}
              </a>
            ) : (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">No email on file</p>
            )}
            {client.spocPhone ? (
              <a className="mt-1 block text-sm text-[var(--primary)]" href={`tel:${client.spocPhone}`}>
                {client.spocPhone}
              </a>
            ) : (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">No phone on file</p>
            )}
          </div>
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
          <Button
            onClick={() => {
              setEditingProject(null);
              setProjectOpen(true);
            }}
          >
            <Plus />
            Add Project
          </Button>
        ) : null}
      </div>
      <Card className="overflow-hidden">
        {client.projects.length === 0 ? (
          <EmptyState
            title="No projects"
            description="Add a project to this client."
            action={
              canEdit ? (
                <Button
                  onClick={() => {
                    setEditingProject(null);
                    setProjectOpen(true);
                  }}
                >
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
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.productionManager ?? "—"}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingProject(project);
                          setProjectOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <IntegrationClientFormDialog
        open={editClient}
        onOpenChange={setEditClient}
        client={client}
        onSaved={load}
      />
      <IntegrationProjectFormDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        clientId={client.id}
        project={editingProject}
        onSaved={load}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete client?"
        description="This permanently deletes the client and all of its projects."
        confirmLabel="Delete"
        danger
        requireTypedValue="DELETE"
        onConfirm={() => void deleteClientRecord()}
      />
    </div>
  );
}
