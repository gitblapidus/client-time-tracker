import { z } from "zod";
import { PROJECT_TYPES } from "@/lib/calculations";
import { FINANCE_EMAIL_PATTERN, parseFinanceEmails } from "@/lib/finance-emails";
import { normalizeProductionManagerName } from "@/lib/production-managers";

const nonNegativeNumber = z.coerce.number().finite().min(0, "Value cannot be negative.");

export const loginSchema = z.object({
  username: z.string().trim().min(1, "User ID is required."),
  password: z.string().min(1, "Password is required."),
  remember: z.boolean().optional(),
});

export const financeEmailValueSchema = z
  .string()
  .trim()
  .max(254)
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : null))
  .refine((value) => value == null || FINANCE_EMAIL_PATTERN.test(value), {
    message: "Enter a valid finance email address.",
  });

export const clientFinanceEmailsSchema = z
  .union([z.array(z.string()), z.string(), z.null(), z.undefined()])
  .transform((value) => parseFinanceEmails(value))
  .refine((emails) => emails.length <= 20, {
    message: "Enter at most 20 finance email addresses.",
  })
  .refine((emails) => emails.every((email) => email.length <= 254 && FINANCE_EMAIL_PATTERN.test(email)), {
    message: "Enter valid finance email addresses, one per line.",
  });

export const optionalContactNameSchema = z
  .string()
  .trim()
  .max(120, "Name is too long.")
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : null));

export const optionalContactEmailSchema = z
  .string()
  .trim()
  .max(254)
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : null))
  .refine((value) => value == null || FINANCE_EMAIL_PATTERN.test(value), {
    message: "Enter a valid email address.",
  });

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required.").max(120, "Client name is too long."),
  active: z.boolean().default(true),
  financeEmails: clientFinanceEmailsSchema.optional().default([]),
  executiveName: optionalContactNameSchema.optional(),
  executiveEmail: optionalContactEmailSchema.optional(),
  spocName: optionalContactNameSchema.optional(),
  spocEmail: optionalContactEmailSchema.optional(),
});

export const clientPatchSchema = z.object({
  active: z.boolean(),
});

export const settingsSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  financeEmail: financeEmailValueSchema,
  defaultMonthlyHours: nonNegativeNumber,
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
});

export const projectSchema = z
  .object({
    clientId: z.string().min(1, "Client is required."),
    name: z.string().trim().min(1, "Project name is required.").max(120, "Project name is too long."),
    type: z.enum(PROJECT_TYPES),
    monthlyHours: z.coerce.number().finite().optional().nullable(),
    maximumCarryoverHours: z.coerce.number().finite().optional().nullable(),
    openingCarryoverHours: z.coerce.number().finite().optional().nullable(),
    productionManager: z
      .union([
        z.string().max(120, "Project manager name is too long."),
        z.null(),
        z.undefined(),
      ])
      .optional()
      .transform((value) => normalizeProductionManagerName(typeof value === "string" ? value : null)),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === "MANAGED_SERVICE") {
      if (data.monthlyHours == null || Number.isNaN(data.monthlyHours)) {
        ctx.addIssue({
          code: "custom",
          path: ["monthlyHours"],
          message: "Monthly hours are required for Managed Service projects.",
        });
      } else if (data.monthlyHours < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["monthlyHours"],
          message: "Monthly hours cannot be negative.",
        });
      }
      if (data.maximumCarryoverHours == null || Number.isNaN(data.maximumCarryoverHours)) {
        ctx.addIssue({
          code: "custom",
          path: ["maximumCarryoverHours"],
          message: "Maximum carryover hours are required for Managed Service projects.",
        });
      } else if (data.maximumCarryoverHours < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["maximumCarryoverHours"],
          message: "Maximum carryover cannot be negative.",
        });
      }
      if (data.openingCarryoverHours != null && !Number.isNaN(data.openingCarryoverHours) && data.openingCarryoverHours < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["openingCarryoverHours"],
          message: "Opening carryover cannot be negative.",
        });
      }
    }
  });

export const timeEntryItemSchema = z.object({
  projectId: z.string().min(1),
  hoursUsed: nonNegativeNumber.optional(),
  developmentHours: nonNegativeNumber.optional(),
  pmHours: nonNegativeNumber.optional(),
});

export const timeEntryBulkSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  entries: z.array(timeEntryItemSchema).min(1, "No time entries to save."),
});

export const reportQuerySchema = z.object({
  clientIds: z.array(z.string()).optional().default([]),
  projectIds: z.array(z.string()).optional().default([]),
  productionManagers: z.array(z.string()).optional().default([]),
  startYear: z.coerce.number().int().min(2000).max(2100),
  startMonth: z.coerce.number().int().min(1).max(12),
  endYear: z.coerce.number().int().min(2000).max(2100),
  endMonth: z.coerce.number().int().min(1).max(12),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm the new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export const userCreateSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, "User ID is required.")
      .max(80, "User ID is too long.")
      .transform((value) => value.toLowerCase())
      .refine((value) => /^[a-z0-9._-]+$/.test(value), {
        message: "User ID may use letters, numbers, periods, hyphens, and underscores.",
      }),
    name: z.string().trim().min(1, "Name is required.").max(120, "Name is too long."),
    role: z.enum(["ADMIN", "USER"]).default("USER"),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm the password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const adminPasswordResetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm the password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const userPatchSchema = z.object({
  active: z.boolean(),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120, "Name is too long."),
  role: z.enum(["ADMIN", "USER"]),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type TimeEntryBulkInput = z.infer<typeof timeEntryBulkSchema>;
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
