"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  requireTypedValue,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  requireTypedValue?: string;
  onConfirm: () => void;
}) {
  const [typedValue, setTypedValue] = React.useState("");
  const confirmed = !requireTypedValue || typedValue === requireTypedValue;

  React.useEffect(() => {
    if (open) {
      setTypedValue("");
    }
  }, [open]);

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--foreground)]/40" />
        <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
          <AlertDialogPrimitive.Title className="text-lg font-semibold text-[var(--foreground)]">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            {description}
          </AlertDialogPrimitive.Description>
          {requireTypedValue ? (
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="confirm-typed-value">
                Type {requireTypedValue} to confirm
              </Label>
              <Input
                id="confirm-typed-value"
                value={typedValue}
                autoComplete="off"
                onChange={(event) => setTypedValue(event.target.value)}
              />
            </div>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogPrimitive.Cancel>
            {requireTypedValue ? (
              <Button
                variant={danger ? "danger" : "default"}
                disabled={!confirmed}
                onClick={() => {
                  if (!confirmed) return;
                  onConfirm();
                }}
              >
                {confirmLabel}
              </Button>
            ) : (
              <AlertDialogPrimitive.Action asChild>
                <Button variant={danger ? "danger" : "default"} onClick={onConfirm}>
                  {confirmLabel}
                </Button>
              </AlertDialogPrimitive.Action>
            )}
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
