"use server";

import { ActivityType, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPhoneHref } from "@/lib/utils";
import { contactFormSchema } from "@/lib/validation";

export type ActionState = {
  error?: string;
  saved?: boolean;
  success?: string;
};

export async function updateContactAction(
  previousState: ActionState = {},
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const session = await requireRole([Role.ADVISOR, Role.DISPATCHER, Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const parsed = contactFormSchema.safeParse({
    contacted: formData.get("contacted") ?? "false",
    hasRentalCar: formData.get("hasRentalCar") ?? "false",
    repairValue: formData.get("repairValue") ?? "",
    customerNotes: formData.get("customerNotes"),
    roNumber: formData.get("roNumber"),
  });

  if (!parsed.success) {
    return { error: "Unable to save the contact update.", saved: false };
  }

  const repairOrder = await prisma.repairOrder.findUnique({
    where: {
      organizationId_roNumber: {
        organizationId,
        roNumber: parsed.data.roNumber,
      },
    },
    include: {
      blockerState: true,
      contactState: true,
    },
  });

  if (!repairOrder) {
    return { error: "That RO could not be found.", saved: false };
  }

  if (
    session.user.role === Role.ADVISOR &&
    repairOrder.asmNumber !== session.user.asmNumber
  ) {
    return { error: "That RO is not assigned to your ASM number.", saved: false };
  }

  if (session.user.role === Role.ADVISOR) {
    return {
      error: "Use the Call Customer button to log advisor contact updates.",
      saved: false,
    };
  }

  const actorLabel =
    session.user.role === Role.MANAGER
      ? "Manager"
      : session.user.role === Role.DISPATCHER
        ? "Dispatcher"
        : "Advisor";
  const contactTimestamp = parsed.data.contacted
    ? (repairOrder.contactState?.contactedAt ?? new Date())
    : null;

  await prisma.$transaction(async (transaction) => {
    await transaction.repairOrder.update({
      where: { id: repairOrder.id },
      data: {
        repairValue: parsed.data.repairValue,
      },
    });

    await transaction.contactState.upsert({
      where: { repairOrderId: repairOrder.id },
      update: {
        advisorUserId: session.user.id,
        contacted: parsed.data.contacted,
        contactedAt: contactTimestamp,
        hasRentalCar: parsed.data.hasRentalCar,
        customerNotes: parsed.data.customerNotes || null,
      },
      create: {
        advisorUserId: session.user.id,
        contacted: parsed.data.contacted,
        contactedAt: contactTimestamp,
        hasRentalCar: parsed.data.hasRentalCar,
        customerNotes: parsed.data.customerNotes || null,
        repairOrderId: repairOrder.id,
      },
    });

    await transaction.activityLog.create({
      data: {
        message: parsed.data.contacted
          ? `${actorLabel} updated customer contact state.`
          : `${actorLabel} cleared customer contacted status.`,
        metadata: {
          actorRole: session.user.role,
          contacted: parsed.data.contacted,
          customerNotes: parsed.data.customerNotes || null,
          hasRentalCar: parsed.data.hasRentalCar,
          repairValue: parsed.data.repairValue,
        } satisfies Prisma.InputJsonValue,
        repairOrderId: repairOrder.id,
        type: ActivityType.CONTACT_UPDATED,
        userId: session.user.id,
      },
    });
  });

  revalidatePath("/advisor");
  revalidatePath("/dispatcher");
  revalidatePath("/manager");
  revalidatePath("/manager/alerts");
  revalidatePath("/manager/reports");

  return {
    saved: true,
  };
}

export async function addRepairOrderNoteAction(
  previousState: ActionState = {},
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const session = await requireRole([Role.ADVISOR, Role.DISPATCHER, Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const roNumber = Number(formData.get("roNumber"));
  const note = String(formData.get("note") || "").trim();

  if (!Number.isInteger(roNumber) || roNumber <= 0) {
    return { error: "Missing RO number.", saved: false };
  }

  if (!note) {
    return { error: "Enter a note before saving.", saved: false };
  }

  if (note.length > 2000) {
    return { error: "Notes must be 2,000 characters or fewer.", saved: false };
  }

  const repairOrder = await prisma.repairOrder.findUnique({
    where: {
      organizationId_roNumber: {
        organizationId,
        roNumber,
      },
    },
    select: {
      asmNumber: true,
      id: true,
      roNumber: true,
    },
  });

  if (!repairOrder) {
    return { error: "That RO could not be found.", saved: false };
  }

  if (
    session.user.role === Role.ADVISOR &&
    repairOrder.asmNumber !== session.user.asmNumber
  ) {
    return { error: "That RO is not assigned to your ASM number.", saved: false };
  }

  await prisma.$transaction([
    prisma.repairOrderNote.create({
      data: {
        note,
        organizationId,
        repairOrderId: repairOrder.id,
        userId: session.user.id,
      },
    }),
    prisma.activityLog.create({
      data: {
        message: `Internal note added for RO ${repairOrder.roNumber}.`,
        metadata: {
          note,
        } satisfies Prisma.InputJsonValue,
        repairOrderId: repairOrder.id,
        type: ActivityType.RO_NOTE_ADDED,
        userId: session.user.id,
      },
    }),
  ]);

  revalidatePath("/advisor");
  revalidatePath("/dispatcher");
  revalidatePath("/manager");
  revalidatePath("/manager/reports");

  return {
    saved: true,
    success: "Note saved.",
  };
}

function normalizeContactPhoneInput(value: FormDataEntryValue | null) {
  const rawPhone = String(value || "").trim();
  const href = formatPhoneHref(rawPhone);

  if (!href) {
    return null;
  }

  return href.replace(/^tel:/, "");
}

export async function updateRepairOrderPrimaryPhoneAction(
  previousState: ActionState = {},
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const roNumber = Number(formData.get("roNumber"));
  const phoneNumber = normalizeContactPhoneInput(formData.get("phoneNumber"));

  if (!Number.isInteger(roNumber) || roNumber <= 0) {
    return { error: "Missing RO number.", saved: false };
  }

  if (!phoneNumber) {
    return { error: "Enter a valid phone number.", saved: false };
  }

  const repairOrder = await prisma.repairOrder.findUnique({
    where: {
      organizationId_roNumber: {
        organizationId,
        roNumber,
      },
    },
    select: {
      id: true,
      phone: true,
      roNumber: true,
    },
  });

  if (!repairOrder) {
    return { error: "That RO could not be found.", saved: false };
  }

  await prisma.$transaction([
    prisma.repairOrder.update({
      where: {
        id: repairOrder.id,
      },
      data: {
        phone: phoneNumber,
      },
    }),
    prisma.activityLog.create({
      data: {
        message: `Primary phone updated for RO ${repairOrder.roNumber}.`,
        metadata: {
          nextPhone: phoneNumber,
          previousPhone: repairOrder.phone,
        } satisfies Prisma.InputJsonValue,
        repairOrderId: repairOrder.id,
        type: ActivityType.RO_NOTE_ADDED,
        userId: session.user.id,
      },
    }),
  ]);

  revalidatePath("/advisor");
  revalidatePath("/dispatcher");
  revalidatePath("/manager");

  return {
    saved: true,
    success: "Primary phone updated.",
  };
}

export async function addRepairOrderContactPhoneAction(
  previousState: ActionState = {},
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const session = await requireRole([Role.ADVISOR, Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const roNumber = Number(formData.get("roNumber"));
  const phoneNumber = normalizeContactPhoneInput(formData.get("phoneNumber"));
  const label = String(formData.get("label") || "").trim().slice(0, 80) || null;

  if (!Number.isInteger(roNumber) || roNumber <= 0) {
    return { error: "Missing RO number.", saved: false };
  }

  if (!phoneNumber) {
    return { error: "Enter a valid alternate phone number.", saved: false };
  }

  const repairOrder = await prisma.repairOrder.findUnique({
    where: {
      organizationId_roNumber: {
        organizationId,
        roNumber,
      },
    },
    select: {
      asmNumber: true,
      id: true,
      phone: true,
      roNumber: true,
    },
  });

  if (!repairOrder) {
    return { error: "That RO could not be found.", saved: false };
  }

  if (
    session.user.role === Role.ADVISOR &&
    repairOrder.asmNumber !== session.user.asmNumber
  ) {
    return { error: "That RO is not assigned to your ASM number.", saved: false };
  }

  if (repairOrder.phone && normalizeContactPhoneInput(repairOrder.phone) === phoneNumber) {
    return { error: "That number is already the primary phone number.", saved: false };
  }

  try {
    await prisma.$transaction([
      prisma.repairOrderContactPhone.create({
        data: {
          createdById: session.user.id,
          label,
          organizationId,
          phoneNumber,
          repairOrderId: repairOrder.id,
        },
      }),
      prisma.activityLog.create({
        data: {
          message: `Alternate phone added for RO ${repairOrder.roNumber}.`,
          metadata: {
            label,
            phoneNumber,
          } satisfies Prisma.InputJsonValue,
          repairOrderId: repairOrder.id,
          type: ActivityType.RO_NOTE_ADDED,
          userId: session.user.id,
        },
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "That alternate number is already on this RO.", saved: false };
    }

    throw error;
  }

  revalidatePath("/advisor");
  revalidatePath("/dispatcher");
  revalidatePath("/manager");

  return {
    saved: true,
    success: "Alternate phone added.",
  };
}
