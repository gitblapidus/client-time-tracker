"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActiveStatusSelect } from "@/components/ui/active-status-select";
import type { IntegrationClientRecord } from "@/components/integration/integration-clients-view";

export function IntegrationClientFormDialog({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: IntegrationClientRecord | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(client?.name ?? "");
  const [executiveName, setExecutiveName] = useState(client?.executiveName ?? "");
  const [executiveEmail, setExecutiveEmail] = useState(client?.executiveEmail ?? "");
  const [executivePhone, setExecutivePhone] = useState(client?.executivePhone ?? "");
  const [spocName, setSpocName] = useState(client?.spocName ?? "");
  const [spocEmail, setSpocEmail] = useState(client?.spocEmail ?? "");
  const [spocPhone, setSpocPhone] = useState(client?.spocPhone ?? "");
  const [active, setActive] = useState(client?.active ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(client?.name ?? "");
      setExecutiveName(client?.executiveName ?? "");
      setExecutiveEmail(client?.executiveEmail ?? "");
      setExecutivePhone(client?.executivePhone ?? "");
      setSpocName(client?.spocName ?? "");
      setSpocEmail(client?.spocEmail ?? "");
      setSpocPhone(client?.spocPhone ?? "");
      setActive(client?.active ?? true);
    }
  }, [open, client]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name,
        executiveName,
        executiveEmail,
        executivePhone,
        spocName,
        spocEmail,
        spocPhone,
        active,
      };
      if (client) {
        await api(`/api/integration/clients/${client.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Client updated.");
      } else {
        await api("/api/integration/clients", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Client created.");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={client ? "Edit client" : "New client"} className="max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="integration-client-name">Client Name</Label>
            <Input
              id="integration-client-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">Client Executive</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="integration-executive-name">Name</Label>
              <Input
                id="integration-executive-name"
                value={executiveName}
                onChange={(event) => setExecutiveName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="integration-executive-email">Email</Label>
              <Input
                id="integration-executive-email"
                type="email"
                value={executiveEmail}
                onChange={(event) => setExecutiveEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="integration-executive-phone">Phone</Label>
              <Input
                id="integration-executive-phone"
                type="tel"
                value={executivePhone}
                onChange={(event) => setExecutivePhone(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">SPOC</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="integration-spoc-name">Name</Label>
              <Input
                id="integration-spoc-name"
                value={spocName}
                onChange={(event) => setSpocName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="integration-spoc-email">Email</Label>
              <Input
                id="integration-spoc-email"
                type="email"
                value={spocEmail}
                onChange={(event) => setSpocEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="integration-spoc-phone">Phone</Label>
              <Input
                id="integration-spoc-phone"
                type="tel"
                value={spocPhone}
                onChange={(event) => setSpocPhone(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="integration-client-status">Status</Label>
            <ActiveStatusSelect id="integration-client-status" value={active} onChange={setActive} fullWidth />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : client ? "Save Changes" : "Create Client"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
