"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type UserRecord = {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "USER";
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRecord | null;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const editing = Boolean(user);

  useEffect(() => {
    if (!open) return;
    setUsername(user?.username ?? "");
    setName(user?.name ?? "");
    setRole(user?.role ?? "USER");
    setPassword("");
    setConfirmPassword("");
  }, [open, user]);

  async function save() {
    setSaving(true);
    try {
      if (user) {
        await api(`/api/users/${user.id}`, {
          method: "PUT",
          body: JSON.stringify({ name, role }),
        });
        toast.success("User updated.");
      } else {
        await api("/api/users", {
          method: "POST",
          body: JSON.stringify({ username, name, role, password, confirmPassword }),
        });
        toast.success("User created.");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit user" : "New user"}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-id">User ID</Label>
            <Input
              id="user-id"
              value={username}
              autoComplete="off"
              disabled={editing}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-name">Name</Label>
            <Input id="user-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-role">Role</Label>
            <select
              id="user-role"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value as "ADMIN" | "USER")}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {editing ? null : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="user-password">Password</Label>
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-confirm-password">Confirm password</Label>
                <Input
                  id="user-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <p className="text-sm text-slate-500">Passwords must be at least 8 characters.</p>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !name.trim() || (!editing && (!username.trim() || !password))}
            >
              {saving ? "Saving..." : editing ? "Save user" : "Create user"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
