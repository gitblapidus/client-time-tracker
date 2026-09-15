import { NextResponse } from "next/server";
import { jsonError, requireRole } from "@/lib/http";
import { userPatchSchema, userUpdateSchema } from "@/lib/validations";
import { setUserActive, updateUser } from "@/services/user-service";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await context.params;
    const input = userUpdateSchema.parse(await request.json());
    const user = await updateUser(id, input);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(["ADMIN"]);
    const { id } = await context.params;
    const body = userPatchSchema.parse(await request.json());
    const user = await setUserActive(id, body.active, session.user.id);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
