import { auth } from "@/auth";
import { ClientDetailView } from "@/components/client-detail-view";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  return <ClientDetailView clientId={id} canEdit={session?.user.role === "ADMIN"} />;
}
