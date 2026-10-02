import { z } from "zod";
import { BURN_STATUSES } from "@/lib/burn-rate";
import { PROJECT_CURRENCIES, PROJECT_TYPES } from "@/lib/calculations";
import {
  INTEGRATION_DIRECTIONS,
  INTEGRATION_FORMATS,
  INTEGRATION_INTERFACE_TYPES,
  INTEGRATION_MODES,
  INTEGRATION_TYPES,
  normalizeReferenceId,
} from "@/lib/integration-inventory";
import { FINANCE_EMAIL_PATTERN, parseFinanceEmails } from "@/lib/finance-emails";
import { normalizeProductionManagerName } from "@/lib/production-managers";
import { normalizeRichText } from "@/lib/rich-text";

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

export const optionalContactPhoneSchema = z
  .string()
  .trim()
  .max(40, "Phone number is too long.")
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : null))
  .refine((value) => {
    if (value == null) return true;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, {
    message: "Enter a valid phone number.",
  });

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required.").max(120, "Client name is too long."),
  active: z.boolean().default(true),
  financeEmails: clientFinanceEmailsSchema.optional().default([]),
  executiveName: optionalContactNameSchema.optional(),
  executiveEmail: optionalContactEmailSchema.optional(),
  spocName: optionalContactNameSchema.optional(),
  spocEmail: optionalContactEmailSchema.optional(),
  currency: z.enum(PROJECT_CURRENCIES).default("USD"),
  devRate: nonNegativeNumber.optional().default(0),
  pmRate: nonNegativeNumber.optional().default(0),
});

export const clientPatchSchema = z.object({
  active: z.boolean(),
});

export const integrationClientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required.").max(120, "Client name is too long."),
  active: z.boolean().default(true),
  executiveName: optionalContactNameSchema.optional(),
  executiveEmail: optionalContactEmailSchema.optional(),
  executivePhone: optionalContactPhoneSchema.optional(),
  spocName: optionalContactNameSchema.optional(),
  spocEmail: optionalContactEmailSchema.optional(),
  spocPhone: optionalContactPhoneSchema.optional(),
});

const optionalLongTextSchema = z
  .string()
  .trim()
  .max(2000, "Text is too long.")
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : null));

const optionalFieldTextSchema = z
  .string()
  .trim()
  .max(200, "Value is too long.")
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : null));

export const integrationInventorySchema = z.object({
  referenceId: z
    .string()
    .trim()
    .min(1, "Reference ID is required.")
    .max(40, "Reference ID is too long.")
    .transform((value) => normalizeReferenceId(value))
    .refine((value): value is string => Boolean(value) && /^INT-\S/.test(value), {
      message: "Reference ID must start with INT-.",
    }),
  name: z.string().trim().min(1, "Integration is required.").max(120, "Integration name is too long."),
  description: optionalLongTextSchema.optional(),
  mvp: z.boolean().default(false),
  type: z.enum(INTEGRATION_TYPES).default("In Scope"),
  direction: z.enum(INTEGRATION_DIRECTIONS),
  mode: z.enum(INTEGRATION_MODES),
  format: z.enum(INTEGRATION_FORMATS),
  dataSource: optionalFieldTextSchema.optional(),
  dataTarget: optionalFieldTextSchema.optional(),
  responsible: optionalContactNameSchema.optional(),
  pillar: optionalContactNameSchema.optional(),
});

const optionalDetailsTextSchema = z
  .string()
  .trim()
  .max(8000, "Text is too long.")
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : null));

const optionalRichTextSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => normalizeRichText(value))
  .refine((value) => value == null || value.length <= 20000, {
    message: "Text is too long.",
  });

export const integrationDetailsSchema = z.object({
  overview: optionalRichTextSchema.optional(),
  assumptions: z
    .array(z.string().trim().max(2000, "Assumption is too long."))
    .max(30, "Too many assumptions.")
    .optional()
    .default([])
    .transform((values) => values.filter((value) => value.length > 0)),
  source: optionalDetailsTextSchema.optional(),
  target: optionalDetailsTextSchema.optional(),
  interfaceType: z
    .union([z.enum(INTEGRATION_INTERFACE_TYPES), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value ? value : null)),
  interfaceFormat: z
    .union([z.enum(INTEGRATION_FORMATS), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value ? value : null)),
  dataDependencies: optionalDetailsTextSchema.optional(),
  jobDependencies: optionalDetailsTextSchema.optional(),
  frequency: optionalDetailsTextSchema.optional(),
  scheduledMechanism: optionalDetailsTextSchema.optional(),
  performanceConsiderations: optionalDetailsTextSchema.optional(),
  interfaceTimeoutValue: optionalDetailsTextSchema.optional(),
  expectedDataVolume: optionalDetailsTextSchema.optional(),
  solutionApproach: optionalRichTextSchema.optional(),
});

export const integrationProjectSchema = z.object({
  clientId: z.string().min(1, "Client is required."),
  name: z.string().trim().min(1, "Project name is required.").max(120, "Project name is too long."),
  productionManager: z
    .union([
      z.string().max(120, "Project manager name is too long."),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .transform((value) => normalizeProductionManagerName(typeof value === "string" ? value : null)),
  active: z.boolean().default(true),
});

export const projectBurnStatusSchema = z.object({
  burnStatus: z.enum(BURN_STATUSES),
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
    startYear: z.coerce.number().int().min(2000).max(2100),
    startMonth: z.coerce.number().int().min(1).max(12),
    estimatedDevHours: z.coerce.number().finite().optional().nullable(),
    currency: z.enum(PROJECT_CURRENCIES).optional().nullable(),
    devRate: z.coerce.number().finite().optional().nullable(),
    estimatedPmHours: z.coerce.number().finite().optional().nullable(),
    pmRate: z.coerce.number().finite().optional().nullable(),
    quotedHours: z.coerce.number().finite().optional().nullable(),
    quotedDevelopmentHours: z.coerce.number().finite().optional().nullable(),
    quotedDeliveryLeadHours: z.coerce.number().finite().optional().nullable(),
    quotedTechnicalLeadershipHours: z.coerce.number().finite().optional().nullable(),
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
    if (data.type === "SOW") {
      const sowQuoted = [
        ["quotedDevelopmentHours", "Development quoted hours"],
        ["quotedDeliveryLeadHours", "Delivery Lead quoted hours"],
        ["quotedTechnicalLeadershipHours", "Technical Leadership quoted hours"],
      ] as const;
      for (const [path, label] of sowQuoted) {
        const value = data[path];
        if (value == null || Number.isNaN(value)) {
          ctx.addIssue({
            code: "custom",
            path: [path],
            message: `${label} are required for SOW projects.`,
          });
        } else if (value < 0) {
          ctx.addIssue({
            code: "custom",
            path: [path],
            message: `${label} cannot be negative.`,
          });
        }
      }
    }
    if (data.type === "CAPITAL_TIME_AND_MATERIALS") {
      const capitalFields = [
        ["estimatedDevHours", "Estimated Dev Hours"],
        ["devRate", "Dev Rate"],
        ["estimatedPmHours", "Estimated PM Hours"],
        ["pmRate", "PM Rate"],
      ] as const;
      for (const [path, label] of capitalFields) {
        const value = data[path];
        if (value != null && !Number.isNaN(value) && value < 0) {
          ctx.addIssue({
            code: "custom",
            path: [path],
            message: `${label} cannot be negative.`,
          });
        }
      }
    }
  });

export const timeEntryItemSchema = z.object({
  projectId: z.string().min(1),
  hoursUsed: nonNegativeNumber.optional(),
  developmentHours: nonNegativeNumber.optional(),
  pmHours: nonNegativeNumber.optional(),
  deliveryLeadHours: nonNegativeNumber.optional(),
  technicalLeadershipHours: nonNegativeNumber.optional(),
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
export type IntegrationClientInput = z.infer<typeof integrationClientSchema>;
export type IntegrationProjectInput = z.infer<typeof integrationProjectSchema>;
export type IntegrationInventoryInput = z.infer<typeof integrationInventorySchema>;
export type IntegrationDetailsInput = z.infer<typeof integrationDetailsSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type TimeEntryBulkInput = z.infer<typeof timeEntryBulkSchema>;
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
