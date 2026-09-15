import { NextResponse } from "next/server";
import { clientPatchSchema, clientSchema } from "@/lib/validations";
import { jsonError, requireRole, requireSession } from "@/lib/http";
import { deleteClient, getClient, setClientActive, updateClient } from "@/services/client-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const client = await getClient(id);
    return NextResponse.json({ client });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await context.params;
    const input = clientSchema.parse(await request.json());
    const client = await updateClient(id, input);
    return NextResponse.json({ client });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await context.params;
    const body = clientPatchSchema.parse(await request.json());
    const client = await setClientActive(id, body.active);
    return NextResponse.json({ client });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await context.params;
    await deleteClient(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
