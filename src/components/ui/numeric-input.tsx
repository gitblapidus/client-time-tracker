"use client";

import * as React from "react";
import { cn, formatHours } from "@/lib/utils";

const NUMERIC_DRAFT = /^\d*\.?\d*$/;

function toNumber(value: number | string) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toEditableDraft(value: number | string) {
  const numeric = toNumber(value);
  if (numeric === 0) return "";
  return String(numeric);
}

export function NumericInput({
  value,
  onValueChange,
  className,
  min = 0,
  onFocus,
  onBlur,
  onMouseUp,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> & {
  value: number | string;
  onValueChange: (value: number) => void;
  min?: number;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selectOnMouseUp = React.useRef(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  function commit(raw: string) {
    if (raw === "" || raw === ".") {
      onValueChange(min);
      return;
    }
    const next = Number(raw);
    if (Number.isNaN(next)) return;
    onValueChange(Math.max(min, next));
  }

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={editing ? draft : formatHours(toNumber(value))}
      className={cn(
        "flex h-8 w-[5.5rem] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-right text-sm font-medium text-[var(--foreground)] tabular-nums shadow-[var(--shadow-sm)] transition-colors duration-150 placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)]",
        className,
      )}
      onPointerDown={() => {
        if (!editing) {
          selectOnMouseUp.current = true;
          setDraft(toEditableDraft(value));
          setEditing(true);
        }
      }}
      onFocus={(event) => {
        selectOnMouseUp.current = true;
        setDraft(toEditableDraft(value));
        setEditing(true);
        onFocus?.(event);
      }}
      onMouseUp={(event) => {
        if (selectOnMouseUp.current) {
          event.currentTarget.select();
          selectOnMouseUp.current = false;
        }
        onMouseUp?.(event);
      }}
      onChange={(event) => {
        selectOnMouseUp.current = false;
        const raw = event.target.value;
        if (raw !== "" && !NUMERIC_DRAFT.test(raw)) return;
        setDraft(raw);
        commit(raw);
      }}
      onBlur={(event) => {
        const raw = event.currentTarget.value;
        selectOnMouseUp.current = false;
        requestAnimationFrame(() => {
          if (inputRef.current && document.activeElement === inputRef.current) return;
          commit(raw);
          setEditing(false);
          setDraft("");
        });
        onBlur?.(event);
      }}
    />
  );
}
