import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { AppError, ForbiddenError, UnauthorizedError, toSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type Role = "ADMIN" | "USER";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new ForbiddenError();
  }
  return session;
}

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Please correct the highlighted fields.";
    return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error("Database request failed", { code: error.code });
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with that name already exists.", code: "CONFLICT" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Unable to save your changes right now.", code: "DATABASE_ERROR" },
      { status: 500 },
    );
  }

  const safe = toSafeErrorMessage(error);
  if (!(error instanceof AppError)) {
    logger.error("Unhandled application error", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
  return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
}

export function parseJson<T>(input: unknown, schema: { parse: (value: unknown) => T }): T {
  return schema.parse(input);
}
