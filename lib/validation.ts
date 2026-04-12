import { AlertTrigger, BlockerReason, RepairValue, Role } from "@prisma/client";
import { z } from "zod";

const optionalString = z.preprocess(
  (value) => {
    if (value == null) {
      return undefined;
    }

    const stringValue = String(value).trim();
    return stringValue.length > 0 ? stringValue : undefined;
  },
  z.string().trim().optional(),
);

const optionalPositiveInt = z.preprocess(
  (value) => {
    if (value == null) {
      return undefined;
    }

    const stringValue = String(value).trim();
    return stringValue.length > 0 ? stringValue : undefined;
  },
  z.coerce.number().int().positive().optional(),
);

const requiredIdentifier = z.string().trim().min(1);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const userRoleShape = z
  .object({
    active: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).transform(
      (value) => value === "on" || value === "true",
    ),
    asmNumber: optionalPositiveInt,
    email: z.email().trim(),
    name: z.string().trim().min(1).max(120),
    role: z.nativeEnum(Role),
    techNumber: optionalPositiveInt,
  })
  .superRefine((value, context) => {
    if (value.role === Role.SERVICE_SYNCNOW_ADMIN) {
      context.addIssue({
        code: "custom",
        message: "Platform-admin users can only be created from the ServiceSyncNow admin area.",
        path: ["role"],
      });
    }

    if (value.role === Role.ADVISOR && !value.asmNumber) {
      context.addIssue({
        code: "custom",
        message: "Advisor users require an ASM number.",
        path: ["asmNumber"],
      });
    }

    if (value.role !== Role.ADVISOR && value.asmNumber) {
      context.addIssue({
        code: "custom",
        message: "Only advisor users should have an ASM number.",
        path: ["asmNumber"],
      });
    }

    if (value.role === Role.TECH && !value.techNumber) {
      context.addIssue({
        code: "custom",
        message: "Tech users require a tech number.",
        path: ["techNumber"],
      });
    }

    if (value.role !== Role.TECH && value.techNumber) {
      context.addIssue({
        code: "custom",
        message: "Only tech users should have a tech number.",
        path: ["techNumber"],
      });
    }
  });

export const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(8),
});

export const blockerFormSchema = z.object({
  roNumber: z.coerce.number().int().positive(),
  fallbackAsmNumber: optionalPositiveInt,
  fallbackCustomerName: optionalString,
  fallbackModel: optionalString,
  fallbackYear: z.preprocess(
    (value) => {
      if (value == null) {
        return undefined;
      }

      const stringValue = String(value).trim();
      return stringValue.length > 0 ? stringValue : undefined;
    },
    z.coerce.number().int().min(1950).max(2100).optional(),
  ),
  blockerReason: z.nativeEnum(BlockerReason),
  foremanNotes: optionalString.pipe(z.string().trim().max(2000).optional()),
  techPromisedDate: optionalString,
});

export const clearBlockerSchema = z.object({
  roNumber: z.coerce.number().int().positive(),
});

export const contactFormSchema = z.object({
  roNumber: z.coerce.number().int().positive(),
  contacted: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).transform((value) =>
    value === "on" || value === "true",
  ),
  hasRentalCar: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).transform((value) =>
    value === "on" || value === "true",
  ),
  repairValue: z
    .union([z.nativeEnum(RepairValue), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  customerNotes: optionalString.pipe(z.string().trim().max(2000).optional()),
});

export const createUserSchema = userRoleShape.extend({
  password: z.string().min(8).max(200),
});

export const updateUserSchema = userRoleShape.extend({
  userId: requiredIdentifier,
});

export const resetUserPasswordSchema = z.object({
  password: z.string().min(8).max(200),
  userId: requiredIdentifier,
});

export const slaSettingsSchema = z.object({
  blockedAgingHours: z.coerce.number().int().min(1).max(240),
  contactSlaHours: z.coerce.number().int().min(1).max(72),
  dueSoonHours: z.coerce.number().int().min(1).max(72),
});

export const alertRuleSchema = z.object({
  enabled: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).transform(
    (value) => value === "on" || value === "true",
  ),
  name: z.string().trim().min(1).max(120),
  ruleId: requiredIdentifier,
  trigger: z.nativeEnum(AlertTrigger),
});

export const manualUserSchema = z.object({
  email: z.email().trim(),
  role: z.nativeEnum(Role),
  asmNumber: optionalPositiveInt,
  techNumber: optionalPositiveInt,
});

export const gotoConnectSettingsSchema = z.object({
  accountKey: optionalString.pipe(z.string().trim().max(200).optional()),
  accessToken: optionalString.pipe(z.string().trim().max(4000).optional()),
  autoAnswer: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).transform(
    (value) => value === "on" || value === "true",
  ),
  clientId: optionalString.pipe(z.string().trim().max(200).optional()),
  clientSecret: optionalString.pipe(z.string().trim().max(500).optional()),
  enabled: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).transform(
    (value) => value === "on" || value === "true",
  ),
  launchUrlTemplate: optionalString.pipe(z.string().trim().max(2000).optional()),
  organizationId: optionalString.pipe(z.string().trim().max(200).optional()),
  phoneNumberId: optionalString.pipe(z.string().trim().max(200).optional()),
});

export const gotoConnectAdvisorExtensionSchema = z.object({
  gotoConnectExtension: optionalString.pipe(z.string().trim().max(40).optional()),
  userId: requiredIdentifier,
});

export const createOrganizationSchema = z.object({
  firstUserEmail: z.email().trim(),
  firstUserName: z.string().trim().min(1).max(120),
  firstUserPassword: z.string().min(8).max(200),
  organizationName: z.string().trim().min(2).max(120),
  organizationSlug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(slugPattern, "Use lowercase letters, numbers, and single hyphens only."),
});

export const updateOrganizationSchema = z.object({
  organizationId: requiredIdentifier,
  organizationName: z.string().trim().min(2).max(120),
  organizationSlug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(slugPattern, "Use lowercase letters, numbers, and single hyphens only."),
});

export const createOrganizationManagerSchema = z.object({
  managerEmail: z.email().trim(),
  managerName: z.string().trim().min(1).max(120),
  managerPassword: z.string().min(8).max(200),
  organizationId: requiredIdentifier,
});

export const platformIntegrationSettingsSchema = z.object({
  awsRegion: optionalString.pipe(z.string().trim().max(100).optional()),
  openAiApiKey: optionalString.pipe(z.string().trim().max(400).optional()),
  openAiTranscriptionModel: optionalString.pipe(z.string().trim().max(120).optional()),
  s3Bucket: optionalString.pipe(z.string().trim().max(120).optional()),
  s3ProcessedCallsPrefix: optionalString.pipe(z.string().trim().max(255).optional()),
  s3RawRecordingsPrefix: optionalString.pipe(z.string().trim().max(255).optional()),
});
