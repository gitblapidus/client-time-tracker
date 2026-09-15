import { auth } from "@/auth";
import { ClientsView } from "@/components/clients-view";

export default async function ClientsPage() {
  const session = await auth();
  return <ClientsView canEdit={session?.user.role === "ADMIN"} />;
}
