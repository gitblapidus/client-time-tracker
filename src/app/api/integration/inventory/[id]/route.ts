import { NextResponse } from "next/server";
import { jsonError, requireRole, requireSession } from "@/lib/http";
import { integrationInventorySchema } from "@/lib/validations";
import {
  deleteIntegrationInventory,
  getIntegrationInventory,
  updateIntegrationInventory,
} from "@/services/integration-inventory-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const item = await getIntegrationInventory(id);
    return NextResponse.json({ item });
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
    const input = integrationInventorySchema.parse(await request.json());
    const item = await updateIntegrationInventory(id, input);
    return NextResponse.json({ item });
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
    await deleteIntegrationInventory(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
