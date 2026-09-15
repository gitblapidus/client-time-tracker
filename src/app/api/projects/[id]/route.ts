import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { jsonError, requireRole, requireSession } from "@/lib/http";
import { projectSchema } from "@/lib/validations";
import { getProject, setProjectActive, updateProject } from "@/services/project-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const project = await getProject(id);
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
    const input = projectSchema.parse(await request.json());
    const project = await updateProject(id, input);
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
    const project = await setProjectActive(id, body.active);
    return NextResponse.json({ project });
  } catch (error) {
    return jsonError(error);
  }
}
