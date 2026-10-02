import { NextResponse } from "next/server";
import { jsonError, requireRole, requireSession } from "@/lib/http";
import { parseBooleanParam, parseListParam } from "@/lib/query-params";
import { integrationInventorySchema } from "@/lib/validations";
import {
  createIntegrationInventory,
  listIntegrationInventory,
} from "@/services/integration-inventory-service";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const result = await listIntegrationInventory({
      search: searchParams.get("search") ?? undefined,
      mvp: parseBooleanParam(searchParams, "mvp"),
      type: parseListParam(searchParams, "type"),
      direction: parseListParam(searchParams, "direction"),
      mode: parseListParam(searchParams, "mode"),
      format: parseListParam(searchParams, "format"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const input = integrationInventorySchema.parse(await request.json());
    const item = await createIntegrationInventory(input);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
