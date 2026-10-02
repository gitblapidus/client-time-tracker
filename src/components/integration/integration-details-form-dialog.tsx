"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { INTERFACE_ARCHITECTURE_FIELDS, type InterfaceArchitectureKey } from "@/lib/integration-details";
import { INTEGRATION_FORMATS, INTEGRATION_INTERFACE_TYPES } from "@/lib/integration-inventory";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { IntegrationDetailsFields } from "@/services/integration-details-service";

const textareaClassName =
  "min-h-20 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-[var(--shadow-sm)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

type ArchitectureValues = Record<InterfaceArchitectureKey, string>;

function architectureFromDetails(details: IntegrationDetailsFields): ArchitectureValues {
  return {
    source: details.source ?? "",
    target: details.target ?? "",
    interfaceType: details.interfaceType ?? "",
    interfaceFormat: details.interfaceFormat ?? "",
    dataDependencies: details.dataDependencies ?? "",
    jobDependencies: details.jobDependencies ?? "",
    frequency: details.frequency ?? "",
    scheduledMechanism: details.scheduledMechanism ?? "",
    performanceConsiderations: details.performanceConsiderations ?? "",
    interfaceTimeoutValue: details.interfaceTimeoutValue ?? "",
    expectedDataVolume: details.expectedDataVolume ?? "",
  };
}

export function IntegrationDetailsFormDialog({
  open,
  onOpenChange,
  inventoryId,
  details,
  saved,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryId: string;
  details: IntegrationDetailsFields;
  saved: boolean;
  onSaved: () => void;
}) {
  const [overview, setOverview] = useState(details.overview ?? "");
  const [assumptions, setAssumptions] = useState<string[]>(details.assumptions.length ? details.assumptions : [""]);
  const [fields, setFields] = useState<ArchitectureValues>(architectureFromDetails(details));
  const [solutionApproach, setSolutionApproach] = useState(details.solutionApproach ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOverview(details.overview ?? "");
    setAssumptions(details.assumptions.length ? details.assumptions : [""]);
    setFields(architectureFromDetails(details));
    setSolutionApproach(details.solutionApproach ?? "");
  }, [open, details]);

  async function save() {
    setSaving(true);
    try {
      await api(`/api/integration/inventory/${inventoryId}/details`, {
        method: "PUT",
        body: JSON.stringify({
          overview,
          assumptions,
          ...fields,
          solutionApproach,
        }),
      });
      toast.success("Integration details saved.");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save integration details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={saved ? "Edit integration details" : "Add integration details"} className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="details-overview">Integration Overview</Label>
            {open ? (
              <RichTextEditor
                id="details-overview"
                key={`overview-${inventoryId}-${saved}`}
                initialValue={details.overview ?? ""}
                onChange={setOverview}
                aria-label="Integration Overview"
              />
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Assumptions</Label>
            {assumptions.map((assumption, index) => (
              <div key={index} className="flex gap-2">
                <textarea
                  aria-label={`Assumption ${index + 1}`}
                  value={assumption}
                  onChange={(event) => {
                    const next = [...assumptions];
                    next[index] = event.target.value;
                    setAssumptions(next);
                  }}
                  rows={2}
                  className={textareaClassName}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-1 shrink-0 text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                  onClick={() => setAssumptions(assumptions.filter((_, itemIndex) => itemIndex !== index))}
                  aria-label={`Remove assumption ${index + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setAssumptions([...assumptions, ""])}>
              <Plus />
              Add Assumption
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Interface Architecture</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56">Details</TableHead>
                  <TableHead>Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INTERFACE_ARCHITECTURE_FIELDS.map((field) => (
                  <TableRow key={field.key} className="hover:bg-transparent">
                    <TableCell className="align-top font-medium">{field.label}</TableCell>
                    <TableCell>
                      {field.key === "interfaceType" ? (
                        <FilterSelect
                          className="w-full"
                          value={fields.interfaceType}
                          onChange={(event) => setFields({ ...fields, interfaceType: event.target.value })}
                        >
                          <option value="">Select...</option>
                          {INTEGRATION_INTERFACE_TYPES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </FilterSelect>
                      ) : field.key === "interfaceFormat" ? (
                        <FilterSelect
                          className="w-full"
                          value={fields.interfaceFormat}
                          onChange={(event) => setFields({ ...fields, interfaceFormat: event.target.value })}
                        >
                          <option value="">Select...</option>
                          {INTEGRATION_FORMATS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </FilterSelect>
                      ) : (
                        <Input
                          value={fields[field.key]}
                          onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="details-solution-approach">Solution Approach</Label>
            {open ? (
              <RichTextEditor
                id="details-solution-approach"
                key={`solution-${inventoryId}-${saved}`}
                initialValue={details.solutionApproach ?? ""}
                onChange={setSolutionApproach}
                aria-label="Solution Approach"
              />
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
