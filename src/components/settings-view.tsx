"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { APP_VERSION } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";

export function SettingsView() {
  const { data } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [user, setUser] = useState<{ username: string; name: string; role: string } | null>(null);

  useEffect(() => {
    api<{ user: { username: string; name: string; role: string } }>("/api/settings")
      .then((result) => setUser(result.user))
      .catch((error: Error) => toast.error(error.message));
  }, []);

  async function changePassword() {
    try {
      await api("/api/settings", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update password.");
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Account details, password, and application version." />
      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-[var(--text-section)] font-semibold">Current user</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
              <dd className="mt-1 font-medium">{user?.name ?? data?.user?.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">User ID</dt>
              <dd className="mt-1 font-medium">{user?.username ?? data?.user?.username}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt>
              <dd className="mt-1 font-medium">{user?.role ?? data?.user?.role}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Application version</dt>
              <dd className="mt-1 font-medium">DSS Partners {APP_VERSION}</dd>
            </div>
          </dl>
        </Card>
        <Card className="p-6">
          <h2 className="text-[var(--text-section)] font-semibold">Change password</h2>
          <div className="mt-4 grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
            <Button className="w-fit" onClick={changePassword}>Update password</Button>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-[var(--text-section)] font-semibold">Session</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Sign out of DSS Partners on this device.</p>
          <Button className="mt-4" variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
            Logout
          </Button>
        </Card>
      </div>
    </div>
  );
}
