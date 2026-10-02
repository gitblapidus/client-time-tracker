import { NextResponse } from "next/server";
import { jsonError, requireRole } from "@/lib/http";
import { integrationProjectSchema } from "@/lib/validations";
import { createIntegrationProject } from "@/services/integration-project-service";

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const input = integrationProjectSchema.parse(await request.json());
    const project = await createIntegrationProject(input);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
