import { NextResponse } from "next/server";
import { jsonError, requireRole, requireSession } from "@/lib/http";
import { integrationDetailsSchema } from "@/lib/validations";
import { getIntegrationDetails, upsertIntegrationDetails } from "@/services/integration-details-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await context.params;
    const result = await getIntegrationDetails(id);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await context.params;
    const input = integrationDetailsSchema.parse(await request.json());
    const details = await upsertIntegrationDetails(id, input);
    return NextResponse.json({ details });
  } catch (error) {
    return jsonError(error);
  }
}
