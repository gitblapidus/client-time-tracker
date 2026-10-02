import { auth } from "@/auth";
import { IntegrationClientsView } from "@/components/integration/integration-clients-view";

export default async function IntegrationClientsPage() {
  const session = await auth();
  return <IntegrationClientsView canEdit={session?.user.role === "ADMIN"} />;
}
