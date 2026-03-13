import { BlockerReason, Role } from "@prisma/client";
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

const userRoleShape = z
  .object({
    active: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).transform(
      (value) => value === "on" || value === "true",
    ),
    asmNumber: optionalPositiveInt,
    email: z.email().trim(),
    name: z.string().trim().min(1).max(120),
    role: z.nativeEnum(Role),
  })
  .superRefine((value, context) => {
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

export const manualUserSchema = z.object({
  email: z.email().trim(),
  role: z.nativeEnum(Role),
  asmNumber: optionalPositiveInt,
});
