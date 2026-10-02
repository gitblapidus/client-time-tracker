"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  DEFAULT_INTEGRATION_TYPE,
  INTEGRATION_DIRECTIONS,
  INTEGRATION_FORMATS,
  INTEGRATION_MODES,
  INTEGRATION_REFERENCE_PREFIX,
  INTEGRATION_TYPES,
  normalizeReferenceId,
} from "@/lib/integration-inventory";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntegrationInventoryRecord } from "@/components/integration/integration-inventory-view";

export function IntegrationInventoryFormDialog({
  open,
  onOpenChange,
  item,
  responsibles,
  pillars,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: IntegrationInventoryRecord | null;
  responsibles: string[];
  pillars: string[];
  onSaved: () => void;
}) {
  const [referenceId, setReferenceId] = useState(item?.referenceId ?? INTEGRATION_REFERENCE_PREFIX);
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [mvp, setMvp] = useState(item?.mvp ?? false);
  const [type, setType] = useState(item?.type ?? DEFAULT_INTEGRATION_TYPE);
  const [direction, setDirection] = useState(item?.direction ?? "");
  const [mode, setMode] = useState(item?.mode ?? "");
  const [format, setFormat] = useState(item?.format ?? "");
  const [dataSource, setDataSource] = useState(item?.dataSource ?? "");
  const [dataTarget, setDataTarget] = useState(item?.dataTarget ?? "");
  const [responsible, setResponsible] = useState(item?.responsible ?? "");
  const [pillar, setPillar] = useState(item?.pillar ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReferenceId(item?.referenceId ?? INTEGRATION_REFERENCE_PREFIX);
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setMvp(item?.mvp ?? false);
    setType(item?.type ?? DEFAULT_INTEGRATION_TYPE);
    setDirection(item?.direction ?? "");
    setMode(item?.mode ?? "");
    setFormat(item?.format ?? "");
    setDataSource(item?.dataSource ?? "");
    setDataTarget(item?.dataTarget ?? "");
    setResponsible(item?.responsible ?? "");
    setPillar(item?.pillar ?? "");
  }, [open, item]);

  const normalizedReferenceId = normalizeReferenceId(referenceId);
  const canSave = Boolean(normalizedReferenceId && name.trim() && type && direction && mode && format);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        referenceId: normalizedReferenceId,
        name,
        description,
        mvp,
        type,
        direction,
        mode,
        format,
        dataSource,
        dataTarget,
        responsible,
        pillar,
      };
      if (item) {
        await api(`/api/integration/inventory/${item.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Integration updated.");
      } else {
        await api("/api/integration/inventory", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Integration created.");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save integration.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={item ? "Edit integration" : "New integration"} className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="inventory-reference-id">Reference ID</Label>
              <Input
                id="inventory-reference-id"
                value={referenceId}
                onChange={(event) => setReferenceId(event.target.value)}
                onBlur={() => {
                  setReferenceId(normalizeReferenceId(referenceId) ?? INTEGRATION_REFERENCE_PREFIX);
                }}
                placeholder="INT-"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory-name">Integration</Label>
              <Input
                id="inventory-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inventory-description">Description</Label>
            <textarea
              id="inventory-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="min-h-20 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-[var(--shadow-sm)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inventory-type">Type</Label>
              <FilterSelect
                id="inventory-type"
                className="w-full"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {INTEGRATION_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory-mvp">MVP</Label>
              <FilterSelect
                id="inventory-mvp"
                className="w-full"
                value={mvp ? "true" : "false"}
                onChange={(event) => setMvp(event.target.value === "true")}
              >
                <option value="false">N</option>
                <option value="true">Y</option>
              </FilterSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory-direction">Direction to Intershop</Label>
              <FilterSelect
                id="inventory-direction"
                className="w-full"
                value={direction}
                onChange={(event) => setDirection(event.target.value)}
              >
                <option value="">Select...</option>
                {INTEGRATION_DIRECTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory-mode">Mode</Label>
              <FilterSelect
                id="inventory-mode"
                className="w-full"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
              >
                <option value="">Select...</option>
                {INTEGRATION_MODES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory-format">Format</Label>
              <FilterSelect
                id="inventory-format"
                className="w-full"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                <option value="">Select...</option>
                {INTEGRATION_FORMATS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory-data-source">Data Source</Label>
              <Input
                id="inventory-data-source"
                value={dataSource}
                onChange={(event) => setDataSource(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory-data-target">Data Target</Label>
              <Input
                id="inventory-data-target"
                value={dataTarget}
                onChange={(event) => setDataTarget(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory-responsible">Responsible</Label>
              <Combobox
                id="inventory-responsible"
                value={responsible}
                onValueChange={setResponsible}
                options={responsibles}
                placeholder="Select or enter a name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inventory-pillar">Pillar</Label>
              <Combobox
                id="inventory-pillar"
                value={pillar}
                onValueChange={setPillar}
                options={pillars}
                placeholder="Select or enter a pillar"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !canSave}>
              {saving ? "Saving..." : item ? "Save Changes" : "Create Integration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
