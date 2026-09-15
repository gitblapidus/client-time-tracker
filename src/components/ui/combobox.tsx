"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function Combobox({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select or enter a name",
  disabled,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, value]);

  const exactMatch = options.some((option) => option.toLowerCase() === value.trim().toLowerCase());
  const canCreate = Boolean(value.trim()) && !exactMatch;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function choose(next: string) {
    onValueChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (filtered[0] && value.trim()) {
                const match = filtered.find((option) => option.toLowerCase() === value.trim().toLowerCase());
                choose(match ?? (canCreate ? value.trim() : filtered[0]));
              } else if (canCreate) {
                choose(value.trim());
              }
            }
          }}
          className="pr-9"
        />
        <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50",
                  option.toLowerCase() === value.trim().toLowerCase() && "bg-slate-50 font-medium",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option}
              </button>
            </li>
          ))}
          {canCreate ? (
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(value.trim())}
              >
                Use “{value.trim()}”
              </button>
            </li>
          ) : null}
          {filtered.length === 0 && !canCreate ? (
            <li className="px-3 py-2 text-sm text-slate-500">No matching names</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
