"use server";

import { hash } from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createOrganizationSchema,
  createOrganizationManagerSchema,
  updateOrganizationSchema,
} from "@/lib/validation";

export type CreateOrganizationActionState = {
  error?: string;
  success?: string;
};

export type UpdateOrganizationActionState = {
  error?: string;
  success?: string;
};

export type CreateOrganizationManagerActionState = {
  error?: string;
  success?: string;
};

export async function createOrganizationAction(
  previousState: CreateOrganizationActionState = {},
  formData: FormData,
): Promise<CreateOrganizationActionState> {
  void previousState;
  await requireRole([Role.SERVICE_SYNCNOW_ADMIN]);

  const parsed = createOrganizationSchema.safeParse({
    firstUserEmail: formData.get("firstUserEmail"),
    firstUserName: formData.get("firstUserName"),
    firstUserPassword: formData.get("firstUserPassword"),
    organizationName: formData.get("organizationName"),
    organizationSlug: formData.get("organizationSlug"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the org details and try again.",
    };
  }

  const passwordHash = await hash(parsed.data.firstUserPassword, 12);

  try {
    await prisma.$transaction(async (transaction) => {
      const organization = await transaction.organization.create({
        data: {
          active: true,
          name: parsed.data.organizationName,
          slug: parsed.data.organizationSlug,
        },
      });

      await transaction.user.create({
        data: {
          active: true,
          email: parsed.data.firstUserEmail,
          name: parsed.data.firstUserName,
          organizationId: organization.id,
          passwordHash,
          role: Role.MANAGER,
        },
      });

      await transaction.slaSettings.create({
        data: {
          organizationId: organization.id,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "That org slug or first-user email is already in use.",
      };
    }

    return {
      error: "Unable to create the org and first user.",
    };
  }

  revalidatePath("/servicesyncnow-admin");

  return {
    success: `Created ${parsed.data.organizationName} and provisioned ${parsed.data.firstUserEmail}.`,
  };
}

export async function updateOrganizationAction(
  previousState: UpdateOrganizationActionState = {},
  formData: FormData,
): Promise<UpdateOrganizationActionState> {
  void previousState;
  await requireRole([Role.SERVICE_SYNCNOW_ADMIN]);

  const parsed = updateOrganizationSchema.safeParse({
    organizationId: formData.get("organizationId"),
    organizationName: formData.get("organizationName"),
    organizationSlug: formData.get("organizationSlug"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the org details and try again.",
    };
  }

  try {
    const result = await prisma.organization.updateMany({
      where: {
        id: parsed.data.organizationId,
      },
      data: {
        name: parsed.data.organizationName,
        slug: parsed.data.organizationSlug,
      },
    });

    if (result.count === 0) {
      return {
        error: "Unable to update that organization.",
      };
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "That org slug is already in use.",
      };
    }

    return {
      error: "Unable to update that organization.",
    };
  }

  revalidatePath("/servicesyncnow-admin");

  return {
    success: `Updated ${parsed.data.organizationName}.`,
  };
}

export async function createOrganizationManagerAction(
  previousState: CreateOrganizationManagerActionState = {},
  formData: FormData,
): Promise<CreateOrganizationManagerActionState> {
  void previousState;
  await requireRole([Role.SERVICE_SYNCNOW_ADMIN]);

  const parsed = createOrganizationManagerSchema.safeParse({
    managerEmail: formData.get("managerEmail"),
    managerName: formData.get("managerName"),
    managerPassword: formData.get("managerPassword"),
    organizationId: formData.get("organizationId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the manager details and try again.",
    };
  }

  const passwordHash = await hash(parsed.data.managerPassword, 12);

  try {
    const result = await prisma.organization.update({
      where: {
        id: parsed.data.organizationId,
      },
      data: {
        users: {
          create: {
            active: true,
            email: parsed.data.managerEmail,
            name: parsed.data.managerName,
            passwordHash,
            role: Role.MANAGER,
          },
        },
      },
      select: {
        name: true,
      },
    });

    revalidatePath("/servicesyncnow-admin");

    return {
      success: `Added manager ${parsed.data.managerEmail} to ${result.name}.`,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "That manager email is already in use.",
      };
    }

    return {
      error: "Unable to add a manager to that organization.",
    };
  }
}
