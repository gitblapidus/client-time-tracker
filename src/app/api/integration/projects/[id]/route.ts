import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { jsonError, requireRole, requireSession } from "@/lib/http";
import { integrationProjectSchema } from "@/lib/validations";
import {
  getIntegrationProject,
  setIntegrationProjectActive,
  updateIntegrationProject,
} from "@/services/integration-project-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const project = await getIntegrationProject(id);
    return NextResponse.json({ project });
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
    const input = integrationProjectSchema.parse(await request.json());
    const project = await updateIntegrationProject(id, input);
    return NextResponse.json({ project });
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
    const body = (await request.json()) as { active?: boolean };
    if (typeof body.active !== "boolean") {
      throw new AppError("Active flag is required.");
    }
    const project = await setIntegrationProjectActive(id, body.active);
    return NextResponse.json({ project });
  } catch (error) {
    return jsonError(error);
  }
}
