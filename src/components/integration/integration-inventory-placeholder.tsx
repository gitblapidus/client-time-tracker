import { PageHeader } from "@/components/ui/page-header";

export function IntegrationInventoryPlaceholder({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} description="This page is not available yet." />
    </div>
  );
}
