"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActiveStatusSelect } from "@/components/ui/active-status-select";
import type { IntegrationProjectRecord } from "@/components/integration/integration-clients-view";

export function IntegrationProjectFormDialog({
  open,
  onOpenChange,
  clientId,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  project?: IntegrationProjectRecord | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [productionManager, setProductionManager] = useState(project?.productionManager ?? "");
  const [productionManagers, setProductionManagers] = useState<string[]>([]);
  const [active, setActive] = useState(project?.active ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setProductionManager(project?.productionManager ?? "");
    setActive(project?.active ?? true);
    void api<{ productionManagers: string[] }>("/api/production-managers")
      .then((result) => setProductionManagers(result.productionManagers))
      .catch(() => setProductionManagers([]));
  }, [open, project]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        clientId,
        name,
        productionManager,
        active,
      };
      if (project) {
        await api(`/api/integration/projects/${project.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Project updated.");
      } else {
        await api("/api/integration/projects", {
          method: "POST",
          body: JSON.stringify(payload),
        });
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
      <DialogContent title={project ? "Edit project" : "New project"}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="integration-project-name">Project</Label>
            <Input
              id="integration-project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="integration-production-manager">Project Manager</Label>
            <Combobox
              id="integration-production-manager"
              value={productionManager}
              onValueChange={setProductionManager}
              options={productionManagers}
              placeholder="Select or enter a project manager"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="integration-project-status">Status</Label>
            <ActiveStatusSelect id="integration-project-status" value={active} onChange={setActive} fullWidth />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : project ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
