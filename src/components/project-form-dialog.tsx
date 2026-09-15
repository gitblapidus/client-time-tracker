"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/filter-select";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { ActiveStatusSelect } from "@/components/ui/active-status-select";

export type ProjectRecord = {
  id: string;
  clientId: string;
  name: string;
  type: string;
  monthlyHours: number | null;
  maximumCarryoverHours: number | null;
  openingCarryoverHours: number | null;
  productionManager: string | null;
  active: boolean;
};

export function ProjectFormDialog({
  open,
  onOpenChange,
  clients,
  defaultClientId,
  project,
  defaultMonthlyHours = 40,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; name: string }>;
  defaultClientId?: string;
  project?: ProjectRecord | null;
  defaultMonthlyHours?: number;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState(project?.clientId ?? defaultClientId ?? "");
  const [name, setName] = useState(project?.name ?? "");
  const [type, setType] = useState(project?.type ?? "MANAGED_SERVICE");
  const [monthlyHours, setMonthlyHours] = useState(project?.monthlyHours ?? defaultMonthlyHours);
  const [maxCarryover, setMaxCarryover] = useState(project?.maximumCarryoverHours ?? defaultMonthlyHours);
  const [openingCarryover, setOpeningCarryover] = useState(project?.openingCarryoverHours ?? 0);
  const [productionManager, setProductionManager] = useState(project?.productionManager ?? "");
  const [productionManagers, setProductionManagers] = useState<string[]>([]);
  const [active, setActive] = useState(project?.active ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientId(project?.clientId ?? defaultClientId ?? clients[0]?.id ?? "");
    setName(project?.name ?? "");
    setType(project?.type ?? "MANAGED_SERVICE");
    setMonthlyHours(project?.monthlyHours ?? defaultMonthlyHours);
    setMaxCarryover(project?.maximumCarryoverHours ?? project?.monthlyHours ?? defaultMonthlyHours);
    setOpeningCarryover(project?.openingCarryoverHours ?? 0);
    setProductionManager(project?.productionManager ?? "");
    setActive(project?.active ?? true);
    api<{ productionManagers: string[] }>("/api/production-managers")
      .then((result) => {
        const names = result.productionManagers;
        const current = project?.productionManager;
        setProductionManagers(current && !names.includes(current) ? [current, ...names] : names);
      })
      .catch(() => {
        setProductionManagers(project?.productionManager ? [project.productionManager] : []);
      });
  }, [open, project, defaultClientId, clients, defaultMonthlyHours]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        clientId,
        name,
        type,
        monthlyHours: type === "MANAGED_SERVICE" ? monthlyHours : null,
        maximumCarryoverHours: type === "MANAGED_SERVICE" ? maxCarryover : null,
        openingCarryoverHours: type === "MANAGED_SERVICE" ? openingCarryover : null,
        productionManager,
        active,
      };
      if (project) {
        await api(`/api/projects/${project.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Project updated.");
      } else {
        await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Project created.");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={project ? "Edit project" : "Add project"}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-client">Client</Label>
            <select
              id="project-client"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              disabled={Boolean(defaultClientId) && !project}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project Name</Label>
            <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="production-manager">Project Manager</Label>
            <Combobox
              id="production-manager"
              value={productionManager}
              onValueChange={setProductionManager}
              options={productionManagers}
              placeholder="Select or enter a project manager"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-type">Project Type</Label>
            <FilterSelect
              id="project-type"
              className="w-full"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="MANAGED_SERVICE">Managed Service</option>
              <option value="TIME_AND_MATERIALS">Time & Materials</option>
            </FilterSelect>
          </div>
          {type === "MANAGED_SERVICE" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="monthly-hours">Monthly Hours</Label>
                <NumericInput
                  id="monthly-hours"
                  value={monthlyHours}
                  onValueChange={(value) => {
                    setMonthlyHours(value);
                    if (!project) setMaxCarryover(value);
                  }}
                />
                <p className="text-xs text-[var(--muted-foreground)]">Hours allocated to this project each month.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-carryover">Maximum Carryover Hours</Label>
                <NumericInput id="max-carryover" value={maxCarryover} onValueChange={setMaxCarryover} />
                <p className="text-xs text-slate-500">Defaults to monthly hours for new managed service projects.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="opening-carryover">Opening Carryover Hours</Label>
                <NumericInput id="opening-carryover" value={openingCarryover} onValueChange={setOpeningCarryover} />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Unused hours already on the project when tracking starts. Added to the first month&apos;s monthly allocation.
                </p>
              </div>
            </>
          ) : (
            <p className="rounded-[var(--radius-md)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--muted-foreground)] transition-opacity duration-150">
              Time & Materials projects track Development Hours and PM Hours. Monthly allocation and carryover do not apply.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="project-status">Status</Label>
            <ActiveStatusSelect id="project-status" value={active} onChange={setActive} fullWidth />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !name.trim() || !clientId}>
              {saving ? "Saving..." : project ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
