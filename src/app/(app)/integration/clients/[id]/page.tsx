import { auth } from "@/auth";
import { IntegrationClientDetailView } from "@/components/integration/integration-client-detail-view";

export default async function IntegrationClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  return <IntegrationClientDetailView clientId={id} canEdit={session?.user.role === "ADMIN"} />;
}
