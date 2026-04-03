"use server";

import { ActivityType, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactFormSchema } from "@/lib/validation";

export type ActionState = {
  error?: string;
  success?: string;
};

export async function updateContactAction(
  previousState: ActionState = {},
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const session = await requireRole([Role.ADVISOR, Role.DISPATCHER, Role.MANAGER]);
  const parsed = contactFormSchema.safeParse({
    contacted: formData.get("contacted") ?? "false",
    hasRentalCar: formData.get("hasRentalCar") ?? "false",
    customerNotes: formData.get("customerNotes"),
    roNumber: formData.get("roNumber"),
  });

  if (!parsed.success) {
    return { error: "Unable to save the contact update." };
  }

  const repairOrder = await prisma.repairOrder.findUnique({
    where: { roNumber: parsed.data.roNumber },
    include: {
      blockerState: true,
      contactState: true,
    },
  });

  if (!repairOrder) {
    return { error: "That RO could not be found." };
  }

  if (
    session.user.role === Role.ADVISOR &&
    repairOrder.asmNumber !== session.user.asmNumber
  ) {
    return { error: "That RO is not assigned to your ASM number." };
  }

  const actorLabel =
    session.user.role === Role.MANAGER
      ? "Manager"
      : session.user.role === Role.DISPATCHER
        ? "Dispatcher"
        : "Advisor";

  await prisma.$transaction(async (transaction) => {
    await transaction.contactState.upsert({
      where: { repairOrderId: repairOrder.id },
      update: {
        advisorUserId: session.user.id,
        contacted: parsed.data.contacted,
        contactedAt: parsed.data.contacted ? new Date() : null,
        hasRentalCar: parsed.data.hasRentalCar,
        customerNotes: parsed.data.customerNotes || null,
      },
      create: {
        advisorUserId: session.user.id,
        contacted: parsed.data.contacted,
        contactedAt: parsed.data.contacted ? new Date() : null,
        hasRentalCar: parsed.data.hasRentalCar,
        customerNotes: parsed.data.customerNotes || null,
        repairOrderId: repairOrder.id,
      },
    });

    await transaction.activityLog.create({
      data: {
        message: parsed.data.contacted
          ? `${actorLabel} marked customer as contacted.`
          : `${actorLabel} cleared customer contacted status.`,
        metadata: {
          actorRole: session.user.role,
          contacted: parsed.data.contacted,
          customerNotes: parsed.data.customerNotes || null,
          hasRentalCar: parsed.data.hasRentalCar,
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
  revalidatePath("/manager/reports");

  return {
    success: parsed.data.contacted
      ? `Marked RO ${parsed.data.roNumber} as contacted.`
      : `Updated RO ${parsed.data.roNumber} to not contacted.`,
  };
}
