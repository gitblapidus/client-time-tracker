"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { appendQueryValues } from "@/lib/query-params";
import { formatHours } from "@/lib/utils";
import { partitionByProjectType } from "@/lib/time-hours";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterMultiSelect } from "@/components/ui/filter-multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ActiveStatusSelect } from "@/components/ui/active-status-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSectionRow } from "@/components/ui/table";
import { ClientFormDialog } from "@/components/client-form-dialog";
import type { ClientRecord } from "@/components/clients-view";
import { ProjectFormDialog, type ProjectRecord } from "@/components/project-form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResetPasswordDialog } from "@/components/reset-password-dialog";
import { UserFormDialog, type UserRecord } from "@/components/user-form-dialog";

type Tab = "users" | "clients" | "projects" | "finance";

export function AdminView() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>("users");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [projects, setProjects] = useState<Array<ProjectRecord & { client: { name: string } }>>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [type, setType] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState<string[]>([]);
  const [managerFilter, setManagerFilter] = useState<string[]>([]);
  const [productionManagers, setProductionManagers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientOpen, setClientOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientRecord | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    companyName: "DSS Partners",
    financeEmail: "",
    defaultMonthlyHours: 40,
    fiscalYearStartMonth: 1,
  });

  async function load() {
    setLoading(true);
    try {
      const clientParams = new URLSearchParams({ search });
      appendQueryValues(clientParams, "active", status);
      const projectParams = new URLSearchParams({ search });
      appendQueryValues(projectParams, "active", status);
      appendQueryValues(projectParams, "type", type);
      appendQueryValues(projectParams, "clientId", clientFilter);
      appendQueryValues(projectParams, "productionManager", managerFilter);
      const userParams = new URLSearchParams({ search });
      appendQueryValues(userParams, "active", status);
      const [clientResult, projectResult, settingsResult, userResult] = await Promise.all([
        api<{ clients: ClientRecord[] }>(`/api/clients?${clientParams.toString()}`),
        api<{ projects: Array<ProjectRecord & { client: { name: string } }>; productionManagers: string[] }>(
          `/api/projects?${projectParams.toString()}`,
        ),
        api<{ settings: typeof settings }>("/api/settings"),
        api<{ users: UserRecord[] }>(`/api/users?${userParams.toString()}`),
      ]);
      setClients(clientResult.clients);
      setProjects(projectResult.projects);
      setProductionManagers(projectResult.productionManagers ?? []);
      setUsers(userResult.users);
      setSettings({
        ...settingsResult.settings,
        financeEmail: settingsResult.settings.financeEmail ?? "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load administration data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(load, 200);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, type, clientFilter, managerFilter]);

  async function saveSettings() {
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
      toast.success("Finance settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save settings.");
    }
  }

  async function updateUserStatus(user: UserRecord, active: boolean) {
    if (user.active === active) return;
    setUpdatingStatusId(user.id);
    try {
      await api(`/api/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ active }) });
      toast.success(active ? `${user.username} is now active.` : `${user.username} is now inactive.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update user status.");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function updateClientStatus(client: ClientRecord, active: boolean) {
    if (client.active === active) return;
    setUpdatingStatusId(client.id);
    try {
      await api(`/api/clients/${client.id}`, { method: "PATCH", body: JSON.stringify({ active }) });
      toast.success(
        active
          ? `${client.name} is now active.`
          : `${client.name} is now inactive. All of its projects were marked inactive.`,
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update client status.");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function updateProjectStatus(project: ProjectRecord & { client: { name: string } }, active: boolean) {
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
    if (!clientToDelete) return;
    try {
      await api(`/api/clients/${clientToDelete.id}`, { method: "DELETE" });
      toast.success("Client deleted.");
      setClientToDelete(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete client.");
    }
  }

  const groupedProjects = useMemo(() => partitionByProjectType(projects), [projects]);

  return (
    <div>
      <PageHeader
        title="Administration"
        description="Manage users, clients, projects, and finance defaults."
      />
      <div className="mb-4 flex flex-wrap gap-1 rounded-[var(--radius-md)] bg-[var(--muted)] p-1">
        {([
          ["users", "Users"],
          ["clients", "Clients"],
          ["projects", "Projects"],
          ["finance", "Finance"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors duration-150 ${tab === id ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab !== "finance" ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
          {tab === "projects" ? (
            <FilterMultiSelect
              ariaLabel="Filter by project manager"
              placeholder="All project managers"
              countNoun="project managers"
              value={managerFilter}
              onChange={setManagerFilter}
              options={[
                { value: "unassigned", label: "Unassigned" },
                ...productionManagers.map((name) => ({ value: name, label: name })),
              ]}
            />
          ) : null}
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
          {tab === "projects" ? (
            <>
              <FilterMultiSelect
                ariaLabel="Filter by type"
                placeholder="All types"
                countNoun="types"
                value={type}
                onChange={setType}
                options={[
                  { value: "MANAGED_SERVICE", label: "Managed Service" },
                  { value: "TIME_AND_MATERIALS", label: "Time & Materials" },
                ]}
              />
              <FilterMultiSelect
                ariaLabel="Filter by client"
                placeholder="All clients"
                countNoun="clients"
                value={clientFilter}
                onChange={setClientFilter}
                options={clients.map((client) => ({ value: client.id, label: client.name }))}
              />
            </>
          ) : null}
          {tab === "users" ? (
            <Button onClick={() => { setEditingUser(null); setUserOpen(true); }}>
              <Plus />
              New User
            </Button>
          ) : tab === "clients" ? (
            <Button onClick={() => setClientOpen(true)}>
              <Plus />
              New Client
            </Button>
          ) : (
            <Button onClick={() => { setEditingProject(null); setProjectOpen(true); }}>
              <Plus />
              Add Project
            </Button>
          )}
        </div>
      ) : null}
      {tab === "users" ? (
        <Card className="overflow-hidden">
          {loading ? <TableSkeleton /> : users.length === 0 ? (
            <EmptyState title="No users" description="Create a User ID and password so someone can sign in." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="font-medium text-blue-700 hover:underline"
                        onClick={() => {
                          setEditingUser(user);
                          setUserOpen(true);
                        }}
                      >
                        {user.name}
                      </button>
                    </TableCell>
                    <TableCell>{user.role === "ADMIN" ? "Admin" : "User"}</TableCell>
                    <TableCell>
                      <ActiveStatusSelect
                        label={`Status for ${user.username}`}
                        value={user.active}
                        disabled={updatingStatusId === user.id || user.id === session?.user.id}
                        title={user.id === session?.user.id ? "You cannot deactivate your own account." : undefined}
                        onChange={(active) => updateUserStatus(user, active)}
                      />
                    </TableCell>
                    <TableCell>{new Date(user.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" onClick={() => setPasswordUser(user)}>Reset password</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : null}
      {tab === "clients" ? (
        <Card className="overflow-hidden">
          {loading ? <TableSkeleton /> : clients.length === 0 ? (
            <EmptyState title="No clients" description="Create a client to begin project setup." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-mono text-xs text-slate-500">{client.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Link className="font-medium text-blue-700 hover:underline" href={`/clients/${client.id}`}>{client.name}</Link>
                    </TableCell>
                    <TableCell>
                      <ActiveStatusSelect
                        label={`Status for ${client.name}`}
                        value={client.active}
                        disabled={updatingStatusId === client.id}
                        onChange={(active) => updateClientStatus(client, active)}
                      />
                    </TableCell>
                    <TableCell>{new Date(client.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(client.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setClientToDelete(client)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : null}
      {tab === "projects" ? (
        <Card className="overflow-hidden">
          {loading ? <TableSkeleton /> : projects.length === 0 ? (
            <EmptyState title="No projects" description="Add a project to a client." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Project Manager</TableHead>
                  <TableHead className="text-right">Monthly Hours</TableHead>
                  <TableHead className="text-right">Max Carryover</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedProjects.managed.length > 0 ? (
                  <>
                    <TableSectionRow colSpan={7}>Managed Service ({groupedProjects.managed.length})</TableSectionRow>
                    {groupedProjects.managed.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>{project.client.name}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="font-medium text-blue-700 hover:underline"
                            onClick={() => {
                              setEditingProject(project);
                              setProjectOpen(true);
                            }}
                          >
                            {project.name}
                          </button>
                        </TableCell>
                        <TableCell>{project.productionManager ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatHours(project.monthlyHours)}</TableCell>
                        <TableCell className="text-right">{formatHours(project.maximumCarryoverHours)}</TableCell>
                        <TableCell>
                          <ActiveStatusSelect
                            label={`Status for ${project.name}`}
                            value={project.active}
                            disabled={updatingStatusId === project.id}
                            onChange={(active) => updateProjectStatus(project, active)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button onClick={() => { setEditingProject(project); setProjectOpen(true); }}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : null}
                {groupedProjects.timeAndMaterials.length > 0 ? (
                  <>
                    <TableSectionRow colSpan={7}>Time & Materials ({groupedProjects.timeAndMaterials.length})</TableSectionRow>
                    {groupedProjects.timeAndMaterials.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>{project.client.name}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="font-medium text-blue-700 hover:underline"
                            onClick={() => {
                              setEditingProject(project);
                              setProjectOpen(true);
                            }}
                          >
                            {project.name}
                          </button>
                        </TableCell>
                        <TableCell>{project.productionManager ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatHours(project.monthlyHours)}</TableCell>
                        <TableCell className="text-right">{formatHours(project.maximumCarryoverHours)}</TableCell>
                        <TableCell>
                          <ActiveStatusSelect
                            label={`Status for ${project.name}`}
                            value={project.active}
                            disabled={updatingStatusId === project.id}
                            onChange={(active) => updateProjectStatus(project, active)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button onClick={() => { setEditingProject(project); setProjectOpen(true); }}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : null}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : null}
      {tab === "finance" ? (
        <Card className="max-w-xl p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Finance Settings</h2>
              <p className="mt-1 text-sm text-slate-500">
                Generic Finance Email is the company-wide address. It is separate from each client&apos;s finance contacts, which can include multiple addresses.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Company name</Label>
              <Input id="company-name" value={settings.companyName} onChange={(event) => setSettings({ ...settings, companyName: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="finance-email">Generic Finance Email</Label>
              <Input
                id="finance-email"
                type="email"
                placeholder="finance@dsspartners.example"
                value={settings.financeEmail}
                onChange={(event) => setSettings({ ...settings, financeEmail: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default monthly hours for new managed service projects</Label>
              <NumericInput value={settings.defaultMonthlyHours} onValueChange={(value) => setSettings({ ...settings, defaultMonthlyHours: value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fiscal-start">Fiscal year start month</Label>
              <select
                id="fiscal-start"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                value={settings.fiscalYearStartMonth}
                onChange={(event) => setSettings({ ...settings, fiscalYearStartMonth: Number(event.target.value) })}
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {new Date(2026, index, 1).toLocaleString("en-US", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-slate-500">
              Email Finance on a client page uses that client&apos;s finance addresses, not this generic company email. This can later be replaced with SendGrid, Microsoft Graph, or another provider without changing this screen.
            </p>
            <Button onClick={saveSettings}>Save finance settings</Button>
          </div>
        </Card>
      ) : null}
      <ClientFormDialog open={clientOpen} onOpenChange={setClientOpen} onSaved={load} />
      <UserFormDialog
        open={userOpen}
        onOpenChange={(open) => {
          setUserOpen(open);
          if (!open) setEditingUser(null);
        }}
        user={editingUser}
        onSaved={load}
      />
      <ResetPasswordDialog
        open={Boolean(passwordUser)}
        onOpenChange={(open) => {
          if (!open) setPasswordUser(null);
        }}
        user={passwordUser}
      />
      <ProjectFormDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        clients={clients}
        project={editingProject}
        defaultMonthlyHours={settings.defaultMonthlyHours}
        onSaved={load}
      />
      <ConfirmDialog
        open={Boolean(clientToDelete)}
        onOpenChange={(open) => {
          if (!open) setClientToDelete(null);
        }}
        title={clientToDelete ? `Delete ${clientToDelete.name}?` : "Delete client?"}
        description="This permanently deletes the client, its projects, and all related time entries. This cannot be undone."
        confirmLabel="Delete client"
        danger
        requireTypedValue="DELETE"
        onConfirm={deleteClientRecord}
      />
    </div>
  );
}
