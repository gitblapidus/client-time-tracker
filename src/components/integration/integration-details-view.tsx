"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { INTERFACE_ARCHITECTURE_FIELDS } from "@/lib/integration-details";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { usePageCrumbs } from "@/components/layout/page-crumbs";
import { IntegrationDetailsFormDialog } from "@/components/integration/integration-details-form-dialog";
import { RichTextContent } from "@/components/ui/rich-text-editor";
import type { IntegrationDetailsFields } from "@/services/integration-details-service";

function displayValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function IntegrationDetailsView({ inventoryId, canEdit }: { inventoryId: string; canEdit: boolean }) {
  const [inventory, setInventory] = useState<{ id: string; referenceId: string; name: string } | null>(null);
  const [details, setDetails] = useState<IntegrationDetailsFields | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  usePageCrumbs(
    inventory
      ? [
          { href: "/integration/inventory", label: "Inventory of Integrations" },
          { label: "Integration Details" },
        ]
      : null,
  );

  async function load() {
    setLoading(true);
    try {
      const result = await api<{
        inventory: { id: string; referenceId: string; name: string };
        details: IntegrationDetailsFields;
        saved: boolean;
      }>(`/api/integration/inventory/${inventoryId}/details`);
      setInventory(result.inventory);
      setDetails(result.details);
      setSaved(result.saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load integration details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryId]);

  if (loading || !inventory || !details) {
    return (
      <div>
        <div className="mb-5 space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--muted)]" />
          <div className="h-8 w-64 animate-pulse rounded bg-[var(--muted)]" />
        </div>
        <TableSkeleton rows={6} cols={2} />
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/integration/inventory"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Inventory of Integrations
      </Link>
      <PageHeader
        title="Integration Details"
        description={`${inventory.referenceId} · ${inventory.name}`}
        actions={
          canEdit ? (
            <Button onClick={() => setEditOpen(true)}>
              {saved ? <Pencil /> : <Plus />}
              {saved ? "Edit Details" : "Add Details"}
            </Button>
          ) : null
        }
      />
      <div className="space-y-5">
        <Card className="p-6">
          <h2 className="text-[var(--text-section)] font-semibold">Integration Overview</h2>
          <RichTextContent html={details.overview} />
        </Card>
        <Card className="p-6">
          <h2 className="text-[var(--text-section)] font-semibold">Assumptions</h2>
          {details.assumptions.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">No assumptions yet.</p>
          ) : (
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--foreground)]">
              {details.assumptions.map((assumption, index) => (
                <li key={`${index}-${assumption.slice(0, 24)}`} className="whitespace-pre-wrap">
                  {assumption}
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="overflow-hidden">
          <div className="px-6 pt-6">
            <h2 className="text-[var(--text-section)] font-semibold">Interface Architecture</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-56">Details</TableHead>
                <TableHead>Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INTERFACE_ARCHITECTURE_FIELDS.map((field) => (
                <TableRow key={field.key}>
                  <TableCell className="align-top font-medium">{field.label}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{displayValue(details[field.key])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card className="p-6">
          <h2 className="text-[var(--text-section)] font-semibold">Solution Approach</h2>
          <RichTextContent html={details.solutionApproach} />
        </Card>
      </div>
      {canEdit ? (
        <IntegrationDetailsFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          inventoryId={inventoryId}
          details={details}
          saved={saved}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}
