"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClientRecord } from "@/components/clients-view";
import { ActiveStatusSelect } from "@/components/ui/active-status-select";

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientRecord | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(client?.name ?? "");
  const [active, setActive] = useState(client?.active ?? true);
  const [financeEmails, setFinanceEmails] = useState((client?.financeEmails ?? []).join("\n"));
  const [executiveName, setExecutiveName] = useState(client?.executiveName ?? "");
  const [executiveEmail, setExecutiveEmail] = useState(client?.executiveEmail ?? "");
  const [spocName, setSpocName] = useState(client?.spocName ?? "");
  const [spocEmail, setSpocEmail] = useState(client?.spocEmail ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(client?.name ?? "");
      setActive(client?.active ?? true);
      setFinanceEmails((client?.financeEmails ?? []).join("\n"));
      setExecutiveName(client?.executiveName ?? "");
      setExecutiveEmail(client?.executiveEmail ?? "");
      setSpocName(client?.spocName ?? "");
      setSpocEmail(client?.spocEmail ?? "");
    }
  }, [open, client]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name,
        active,
        financeEmails,
        executiveName,
        executiveEmail,
        spocName,
        spocEmail,
      };
      if (client) {
        await api(`/api/clients/${client.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Client updated.");
      } else {
        await api("/api/clients", {
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
            <Label htmlFor="client-name">Client Name</Label>
            <Input id="client-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-900">Client Executive</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="executive-name">Name</Label>
              <Input
                id="executive-name"
                value={executiveName}
                onChange={(event) => setExecutiveName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="executive-email">Email</Label>
              <Input
                id="executive-email"
                type="email"
                value={executiveEmail}
                onChange={(event) => setExecutiveEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-900">SPOC</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spoc-name">Name</Label>
              <Input id="spoc-name" value={spocName} onChange={(event) => setSpocName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spoc-email">Email</Label>
              <Input
                id="spoc-email"
                type="email"
                value={spocEmail}
                onChange={(event) => setSpocEmail(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-finance-emails">Client Finance Emails</Label>
            <textarea
              id="client-finance-emails"
              className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              placeholder={"ap@client.example\nfinance@client.example"}
              value={financeEmails}
              onChange={(event) => setFinanceEmails(event.target.value)}
            />
            <p className="text-sm text-slate-500">
              Enter one address per line. These contacts are specific to this client and are separate from the generic finance email in Administration.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-status">Status</Label>
            <ActiveStatusSelect id="client-status" value={active} onChange={setActive} fullWidth />
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
