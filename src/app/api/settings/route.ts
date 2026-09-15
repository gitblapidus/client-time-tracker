import { NextResponse } from "next/server";
import { jsonError, requireRole, requireSession } from "@/lib/http";
import { passwordChangeSchema, settingsSchema } from "@/lib/validations";
import { changePassword, getSettings, getUserById, updateSettings } from "@/services/user-service";

export async function GET() {
  try {
    const session = await requireSession();
    const [user, settings] = await Promise.all([getUserById(session.user.id), getSettings()]);
    return NextResponse.json({
      user,
      settings,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const input = settingsSchema.parse(await request.json());
    const settings = await updateSettings(input);
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = passwordChangeSchema.parse(await request.json());
    await changePassword(session.user.id, input.currentPassword, input.newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
