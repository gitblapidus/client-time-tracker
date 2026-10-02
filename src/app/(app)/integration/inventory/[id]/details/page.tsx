import { auth } from "@/auth";
import { IntegrationDetailsView } from "@/components/integration/integration-details-view";

export default async function IntegrationInventoryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  return <IntegrationDetailsView inventoryId={id} canEdit={session?.user.role === "ADMIN"} />;
}
