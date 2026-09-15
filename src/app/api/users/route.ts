import { NextResponse } from "next/server";
import { jsonError, requireRole } from "@/lib/http";
import { parseActiveParam } from "@/lib/query-params";
import { userCreateSchema } from "@/lib/validations";
import { createUser, listUsers } from "@/services/user-service";

export async function GET(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const users = await listUsers({ search, active: parseActiveParam(searchParams) });
    return NextResponse.json({ users });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const input = userCreateSchema.parse(await request.json());
    const user = await createUser(input);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
