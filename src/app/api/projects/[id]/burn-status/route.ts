import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/http";
import { projectBurnStatusSchema } from "@/lib/validations";
import { setProjectBurnStatus } from "@/services/project-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const { burnStatus } = projectBurnStatusSchema.parse(await request.json());
    const project = await setProjectBurnStatus(id, burnStatus);
    return NextResponse.json({ project });
  } catch (error) {
    return jsonError(error);
  }
}
