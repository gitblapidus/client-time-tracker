import { NextResponse } from "next/server";
import { clientPatchSchema, integrationClientSchema } from "@/lib/validations";
import { jsonError, requireRole, requireSession } from "@/lib/http";
import {
  deleteIntegrationClient,
  getIntegrationClient,
  setIntegrationClientActive,
  updateIntegrationClient,
} from "@/services/integration-client-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const client = await getIntegrationClient(id);
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
    const input = integrationClientSchema.parse(await request.json());
    const client = await updateIntegrationClient(id, input);
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
    const client = await setIntegrationClientActive(id, body.active);
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
    await deleteIntegrationClient(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
