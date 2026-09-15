"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_VERSION } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error") ? "Your session could not be started." : null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Enter your user ID and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        username: username.trim().toLowerCase(),
        password,
        remember: remember ? "true" : "false",
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid user ID or password.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
      toast.error("Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[var(--sidebar)] px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-white">
            <BrandLogo size="md" priority className="h-14 w-14" />
          </div>
          <p className="mt-8 text-sm font-semibold tracking-[0.18em] text-white/60 uppercase">DSS Partners</p>
          <h1 className="mt-3 max-w-md text-4xl font-semibold tracking-tight">
            Monthly client time management, made simple.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
            Track allocations, remaining hours, and carryover across every managed service project—without the spreadsheet guesswork.
          </p>
        </div>
        <p className="text-xs text-white/40">DSS Partners {APP_VERSION}</p>
      </div>
      <div className="flex items-center justify-center bg-[var(--background)] px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow)]">
              <BrandLogo size="sm" priority />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">DSS Partners</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Sign in to manage client time allocations</p>
          </div>
          <div className="hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Welcome back</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Sign in with your user ID to continue.</p>
          </div>
          <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="space-y-1.5">
              <Label htmlFor="username">User ID</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
              />
              Remember me
            </label>
            {error ? (
              <div className="rounded-[var(--radius-md)] border border-red-200 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]" role="alert">
                {error}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              Sign In
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setUsername("admin");
                setPassword("admin123");
                setError(null);
              }}
            >
              Use Demo Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
