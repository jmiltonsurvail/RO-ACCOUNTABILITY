"use server";

import { hash } from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createUserSchema,
  resetUserPasswordSchema,
  updateUserSchema,
} from "@/lib/validation";

export type UserAdminActionState = {
  error?: string;
  success?: string;
};

export async function createUserAction(
  previousState: UserAdminActionState = {},
  formData: FormData,
): Promise<UserAdminActionState> {
  void previousState;
  await requireRole([Role.MANAGER]);

  const parsed = createUserSchema.safeParse({
    active: formData.get("active") ?? "false",
    asmNumber: formData.get("asmNumber"),
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
    techNumber: formData.get("techNumber"),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return {
      error: firstIssue ?? "Check the user details and try again.",
    };
  }

  const passwordHash = await hash(parsed.data.password, 12);

  try {
    await prisma.user.create({
      data: {
        active: parsed.data.active,
        asmNumber: parsed.data.asmNumber ?? null,
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
        techNumber: parsed.data.techNumber ?? null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "A user with that email already exists." };
    }

    return { error: "Unable to create the user." };
  }

  revalidatePath("/manager/users");

  return {
    success: `Created ${parsed.data.role.toLowerCase()} user ${parsed.data.email}.`,
  };
}

export async function updateUserAction(
  previousState: UserAdminActionState = {},
  formData: FormData,
): Promise<UserAdminActionState> {
  void previousState;
  const session = await requireRole([Role.MANAGER]);

  const parsed = updateUserSchema.safeParse({
    active: formData.get("active") ?? "false",
    asmNumber: formData.get("asmNumber"),
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    techNumber: formData.get("techNumber"),
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the user details and try again.",
    };
  }

  if (
    parsed.data.userId === session.user.id &&
    (!parsed.data.active || parsed.data.role !== Role.MANAGER)
  ) {
    return {
      error: "You cannot deactivate yourself or remove your own manager role.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        active: parsed.data.active,
        asmNumber: parsed.data.asmNumber ?? null,
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        techNumber: parsed.data.techNumber ?? null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Another user already has that email." };
    }

    return { error: "Unable to update the user." };
  }

  revalidatePath("/manager/users");

  return {
    success: `Updated ${parsed.data.email}.`,
  };
}

export async function resetUserPasswordAction(
  previousState: UserAdminActionState = {},
  formData: FormData,
): Promise<UserAdminActionState> {
  void previousState;
  await requireRole([Role.MANAGER]);

  const parsed = resetUserPasswordSchema.safeParse({
    password: formData.get("password"),
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Enter a valid password.",
    };
  }

  const passwordHash = await hash(parsed.data.password, 12);

  try {
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { passwordHash },
    });
  } catch {
    return { error: "Unable to reset the password." };
  }

  revalidatePath("/manager/users");

  return {
    success: "Password reset saved.",
  };
}
