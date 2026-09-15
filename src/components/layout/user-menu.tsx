"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[var(--radius-md)] py-1 pr-1 pl-2 hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label="Open user menu"
        >
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-[var(--foreground)]">{userName}</p>
            <p className="text-[var(--text-muted)] text-[var(--muted-foreground)]">
              {userRole === "ADMIN" ? "Administrator" : "User"}
            </p>
          </div>
          <Avatar name={userName} className="h-9 w-9" />
          <ChevronDown className="hidden h-3.5 w-3.5 text-[var(--muted-foreground)] sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-[var(--danger)] focus:text-[var(--danger)]"
          onSelect={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
