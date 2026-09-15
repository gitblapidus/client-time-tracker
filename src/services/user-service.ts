import bcrypt from "bcryptjs";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { UserCreateInput, UserUpdateInput } from "@/lib/validations";

const userPublicSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers(options?: { search?: string; active?: boolean }) {
  const users = await prisma.user.findMany({
    where: {
      ...(options?.active === undefined ? {} : { active: options.active }),
      ...(options?.search
        ? {
            OR: [
              { username: { contains: options.search.toLowerCase() } },
              { name: { contains: options.search } },
            ],
          }
        : {}),
    },
    select: userPublicSelect,
    orderBy: { username: "asc" },
  });
  return users;
}

export async function createUser(input: UserCreateInput) {
  const existing = await prisma.user.findUnique({ where: { username: input.username } });
  if (existing) {
    throw new ConflictError("A user with this User ID already exists.");
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.create({
    data: {
      username: input.username,
      name: input.name,
      role: input.role,
      passwordHash,
      active: true,
    },
    select: userPublicSelect,
  });
}

export async function updateUser(id: string, input: UserUpdateInput) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, active: true },
  });
  if (!user) {
    throw new NotFoundError("User not found.");
  }
  if (user.role === "ADMIN" && input.role === "USER" && user.active) {
    const otherActiveAdmins = await prisma.user.count({
      where: { id: { not: id }, role: "ADMIN", active: true },
    });
    if (otherActiveAdmins === 0) {
      throw new AppError("At least one active admin is required.", 400, "LAST_ADMIN");
    }
  }
  return prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      role: input.role,
    },
    select: userPublicSelect,
  });
}

export async function setUserActive(id: string, active: boolean, actorUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, active: true },
  });
  if (!user) {
    throw new NotFoundError("User not found.");
  }
  if (user.active === active) {
    return getUserById(id);
  }
  if (!active && user.id === actorUserId) {
    throw new AppError("You cannot deactivate your own account.", 400, "CANNOT_DEACTIVATE_SELF");
  }
  if (!active && user.role === "ADMIN") {
    const otherActiveAdmins = await prisma.user.count({
      where: { id: { not: id }, role: "ADMIN", active: true },
    });
    if (otherActiveAdmins === 0) {
      throw new AppError("At least one active admin is required.", 400, "LAST_ADMIN");
    }
  }
  return prisma.user.update({
    where: { id },
    data: { active },
    select: userPublicSelect,
  });
}

export async function resetUserPassword(id: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    throw new NotFoundError("User not found.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    throw new NotFoundError("User not found.");
  }
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User not found.");
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError("Current password is incorrect.", 400, "INVALID_PASSWORD");
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function getSettings() {
  return prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "DSS Partners",
      financeEmail: "finance@dsspartners.example",
      defaultMonthlyHours: 40,
      fiscalYearStartMonth: 1,
    },
  });
}

export async function updateSettings(data: {
  companyName: string;
  financeEmail: string | null;
  defaultMonthlyHours: number;
  fiscalYearStartMonth: number;
}) {
  return prisma.appSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
}

export function buildFinanceMailto(options: {
  to: string | string[];
  clientName: string;
  periodLabel: string;
  summaryLines: string[];
}) {
  const recipients = (Array.isArray(options.to) ? options.to : [options.to])
    .map((email) => encodeURIComponent(email))
    .join(",");
  const subject = encodeURIComponent(`${options.clientName} time summary — ${options.periodLabel}`);
  const body = encodeURIComponent(
    [
      `Hello,`,
      ``,
      `Please find the time summary for ${options.clientName} covering ${options.periodLabel}.`,
      ``,
      ...options.summaryLines,
      ``,
      `This message was prepared in DSS Partners. A future release can send it through an email service such as SendGrid or Microsoft Graph.`,
    ].join("\n"),
  );
  return `mailto:${recipients}?subject=${subject}&body=${body}`;
}
