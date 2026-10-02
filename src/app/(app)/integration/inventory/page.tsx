import { auth } from "@/auth";
import { IntegrationInventoryView } from "@/components/integration/integration-inventory-view";

export default async function IntegrationInventoryPage() {
  const session = await auth();
  return <IntegrationInventoryView canEdit={session?.user.role === "ADMIN"} />;
}
