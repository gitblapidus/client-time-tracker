import { NextResponse } from "next/server";
import { jsonError, requireRole } from "@/lib/http";
import { adminPasswordResetSchema } from "@/lib/validations";
import { resetUserPassword } from "@/services/user-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await context.params;
    const input = adminPasswordResetSchema.parse(await request.json());
    await resetUserPassword(id, input.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
