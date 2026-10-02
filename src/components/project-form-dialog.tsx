"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { currentYearMonth, parseYearMonth, toYearMonthInput } from "@/lib/months";
import { PROJECT_TYPE_LABELS, currencySymbol, inheritedCapitalRates } from "@/lib/calculations";
import { SOW_HOUR_LINES, totalSowHours } from "@/lib/time-hours";
import { formatHours } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/filter-select";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { ActiveStatusSelect } from "@/components/ui/active-status-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ProjectRecord = {
  id: string;
  clientId: string;
  name: string;
  type: string;
  monthlyHours: number | null;
  maximumCarryoverHours: number | null;
  openingCarryoverHours: number | null;
  startYear: number;
  startMonth: number;
  estimatedDevHours?: number | null;
  currency?: string | null;
  devRate?: number | null;
  estimatedPmHours?: number | null;
  pmRate?: number | null;
  quotedHours?: number | null;
  quotedDevelopmentHours?: number | null;
  quotedDeliveryLeadHours?: number | null;
  quotedTechnicalLeadershipHours?: number | null;
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
  clients: Array<{
    id: string;
    name: string;
    currency?: string | null;
    devRate?: number | null;
    pmRate?: number | null;
  }>;
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
  const [startYear, setStartYear] = useState(project?.startYear ?? currentYearMonth().year);
  const [startMonth, setStartMonth] = useState(project?.startMonth ?? currentYearMonth().month);
  const [estimatedDevHours, setEstimatedDevHours] = useState(project?.estimatedDevHours ?? 0);
  const [currency, setCurrency] = useState(project?.currency ?? "USD");
  const [devRate, setDevRate] = useState(project?.devRate ?? 0);
  const [estimatedPmHours, setEstimatedPmHours] = useState(project?.estimatedPmHours ?? 0);
  const [pmRate, setPmRate] = useState(project?.pmRate ?? 0);
  const [quotedDevelopmentHours, setQuotedDevelopmentHours] = useState(project?.quotedDevelopmentHours ?? 0);
  const [quotedDeliveryLeadHours, setQuotedDeliveryLeadHours] = useState(project?.quotedDeliveryLeadHours ?? 0);
  const [quotedTechnicalLeadershipHours, setQuotedTechnicalLeadershipHours] = useState(
    project?.quotedTechnicalLeadershipHours ?? 0,
  );
  const [productionManager, setProductionManager] = useState(project?.productionManager ?? "");
  const [productionManagers, setProductionManagers] = useState<string[]>([]);
  const [active, setActive] = useState(project?.active ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const nextClientId = project?.clientId ?? defaultClientId ?? clients[0]?.id ?? "";
    const inherited = inheritedCapitalRates(clients.find((client) => client.id === nextClientId));
    setClientId(nextClientId);
    setName(project?.name ?? "");
    setType(project?.type ?? "MANAGED_SERVICE");
    setMonthlyHours(project?.monthlyHours ?? defaultMonthlyHours);
    setMaxCarryover(project?.maximumCarryoverHours ?? project?.monthlyHours ?? defaultMonthlyHours);
    setOpeningCarryover(project?.openingCarryoverHours ?? 0);
    const start = currentYearMonth();
    setStartYear(project?.startYear ?? start.year);
    setStartMonth(project?.startMonth ?? start.month);
    setEstimatedDevHours(project?.estimatedDevHours ?? 0);
    setCurrency(project?.currency ?? inherited.currency);
    setDevRate(project?.devRate ?? inherited.devRate);
    setEstimatedPmHours(project?.estimatedPmHours ?? 0);
    setPmRate(project?.pmRate ?? inherited.pmRate);
    setQuotedDevelopmentHours(
      project?.quotedDevelopmentHours ?? (project?.type === "SOW" ? project.quotedHours ?? 0 : 0),
    );
    setQuotedDeliveryLeadHours(project?.quotedDeliveryLeadHours ?? 0);
    setQuotedTechnicalLeadershipHours(project?.quotedTechnicalLeadershipHours ?? 0);
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
        startYear,
        startMonth,
        estimatedDevHours: type === "CAPITAL_TIME_AND_MATERIALS" ? estimatedDevHours : null,
        currency: type === "CAPITAL_TIME_AND_MATERIALS" ? currency : null,
        devRate: type === "CAPITAL_TIME_AND_MATERIALS" ? devRate : null,
        estimatedPmHours: type === "CAPITAL_TIME_AND_MATERIALS" ? estimatedPmHours : null,
        pmRate: type === "CAPITAL_TIME_AND_MATERIALS" ? pmRate : null,
        quotedDevelopmentHours: type === "SOW" ? quotedDevelopmentHours : null,
        quotedDeliveryLeadHours: type === "SOW" ? quotedDeliveryLeadHours : null,
        quotedTechnicalLeadershipHours: type === "SOW" ? quotedTechnicalLeadershipHours : null,
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
      <DialogContent title={project ? "Edit project" : "Add project"} className="max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-client">Client</Label>
            <select
              id="project-client"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={clientId}
              onChange={(event) => {
                const nextClientId = event.target.value;
                setClientId(nextClientId);
                if (!project) {
                  const inherited = inheritedCapitalRates(clients.find((client) => client.id === nextClientId));
                  setCurrency(inherited.currency);
                  setDevRate(inherited.devRate);
                  setPmRate(inherited.pmRate);
                }
              }}
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
              onChange={(event) => {
                const nextType = event.target.value;
                setType(nextType);
                if (nextType === "CAPITAL_TIME_AND_MATERIALS" && !project) {
                  const inherited = inheritedCapitalRates(clients.find((client) => client.id === clientId));
                  setCurrency(inherited.currency);
                  setDevRate(inherited.devRate);
                  setPmRate(inherited.pmRate);
                }
              }}
            >
              <option value="MANAGED_SERVICE">{PROJECT_TYPE_LABELS.MANAGED_SERVICE}</option>
              <option value="TIME_AND_MATERIALS">{PROJECT_TYPE_LABELS.TIME_AND_MATERIALS}</option>
              <option value="CAPITAL_TIME_AND_MATERIALS">{PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS}</option>
              <option value="SOW">{PROJECT_TYPE_LABELS.SOW}</option>
            </FilterSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-start">Start Month</Label>
            <Input
              id="project-start"
              type="month"
              value={toYearMonthInput(startYear, startMonth)}
              onChange={(event) => {
                const parsed = parseYearMonth(event.target.value);
                if (!parsed) return;
                setStartYear(parsed.year);
                setStartMonth(parsed.month);
              }}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              The first month this project appears on Time Entry, Dashboard, and Reports.
            </p>
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
                  Unused hours already on the project when tracking starts. Added to the Start Month&apos;s monthly allocation.
                </p>
              </div>
            </>
          ) : type === "CAPITAL_TIME_AND_MATERIALS" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="project-currency">Currency</Label>
                <FilterSelect
                  id="project-currency"
                  className="w-full"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </FilterSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-rate">Dev Rate ({currencySymbol(currency)})</Label>
                <NumericInput id="dev-rate" className="w-full" value={devRate} onValueChange={setDevRate} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm-rate">PM Rate ({currencySymbol(currency)})</Label>
                <NumericInput id="pm-rate" className="w-full" value={pmRate} onValueChange={setPmRate} />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Defaults from the client. Change them here to override for this project.
                </p>
              </div>
              <div className="border-t border-[var(--border)]" role="separator" />
              <div className="space-y-1.5">
                <Label htmlFor="estimated-dev-hours">Estimated Dev Hours</Label>
                <NumericInput id="estimated-dev-hours" className="w-full" value={estimatedDevHours} onValueChange={setEstimatedDevHours} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estimated-pm-hours">Estimated PM Hours</Label>
                <NumericInput id="estimated-pm-hours" className="w-full" value={estimatedPmHours} onValueChange={setEstimatedPmHours} />
              </div>
            </>
          ) : type === "SOW" ? (
            <div className="space-y-1.5">
              <Label>Quoted Hours</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Quoted Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SOW_HOUR_LINES.map((line) => {
                    const value =
                      line.key === "developmentHours"
                        ? quotedDevelopmentHours
                        : line.key === "deliveryLeadHours"
                          ? quotedDeliveryLeadHours
                          : quotedTechnicalLeadershipHours;
                    const onValueChange =
                      line.key === "developmentHours"
                        ? setQuotedDevelopmentHours
                        : line.key === "deliveryLeadHours"
                          ? setQuotedDeliveryLeadHours
                          : setQuotedTechnicalLeadershipHours;
                    return (
                      <TableRow key={line.key}>
                        <TableCell className="font-medium">{line.label}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <NumericInput
                              id={`quoted-${line.key}`}
                              aria-label={`${line.label} quoted hours`}
                              value={value}
                              onValueChange={onValueChange}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="font-medium text-[var(--muted-foreground)]">Total</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatHours(
                        totalSowHours(
                          quotedDevelopmentHours,
                          quotedDeliveryLeadHours,
                          quotedTechnicalLeadershipHours,
                        ),
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-[var(--muted-foreground)]">
                Remaining is the total quoted hours minus hours used across all three roles.
              </p>
            </div>
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
