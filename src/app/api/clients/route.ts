import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/errors";
import { jsonError, requireRole, requireSession } from "@/lib/http";
import { parseActiveParam } from "@/lib/query-params";
import { clientSchema } from "@/lib/validations";
import { createClient, listClients } from "@/services/client-service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const clients = await listClients({ search, active: parseActiveParam(searchParams) });
    return NextResponse.json({ clients });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const input = clientSchema.parse(await request.json());
    const client = await createClient(input);
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
