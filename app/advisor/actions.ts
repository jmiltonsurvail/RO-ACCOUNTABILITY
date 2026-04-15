"use server";

import { ActivityType, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const actorLabel =
    session.user.role === Role.MANAGER
      ? "Manager"
      : session.user.role === Role.DISPATCHER
        ? "Dispatcher"
        : "Advisor";
  const shouldCreateContactRecord =
    parsed.data.contacted && Boolean(parsed.data.customerNotes?.trim());
  const contactTimestamp = shouldCreateContactRecord
    ? new Date()
    : parsed.data.contacted
      ? (repairOrder.contactState?.contactedAt ?? null)
      : null;

  await prisma.$transaction(async (transaction) => {
    const latestEligibleCallStartedAt = contactTimestamp
      ? new Date(contactTimestamp.getTime() - 12 * 60 * 60 * 1000)
      : new Date(Date.now() - 12 * 60 * 60 * 1000);
    const latestCallSession = shouldCreateContactRecord
      ? await transaction.callSession.findFirst({
          where: {
            organizationId,
            repairOrderId: repairOrder.id,
            contactRecords: {
              none: {},
            },
            requestedAt: {
              gte: latestEligibleCallStartedAt,
              lte: contactTimestamp ?? new Date(),
            },
          },
          orderBy: {
            requestedAt: "desc",
          },
          select: {
            id: true,
          },
        })
      : null;
    const existingLinkedContactRecord =
      shouldCreateContactRecord && latestCallSession
        ? await transaction.contactRecord.findFirst({
            where: {
              callSessionId: latestCallSession.id,
            },
            select: {
              id: true,
            },
          })
        : null;

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

    if (shouldCreateContactRecord) {
      if (existingLinkedContactRecord) {
        await transaction.contactRecord.update({
          where: {
            id: existingLinkedContactRecord.id,
          },
          data: {
            advisorUserId: session.user.id,
            contactedAt: contactTimestamp ?? new Date(),
            customerNotes: parsed.data.customerNotes || null,
          },
        });
      } else {
        await transaction.contactRecord.create({
          data: {
            advisorUserId: session.user.id,
            callSessionId: latestCallSession?.id ?? null,
            contactedAt: contactTimestamp ?? new Date(),
            customerNotes: parsed.data.customerNotes || null,
            repairOrderId: repairOrder.id,
          },
        });
      }
    }

    await transaction.activityLog.create({
      data: {
        message: parsed.data.contacted
          ? `${actorLabel} marked customer as contacted and logged a contact record.`
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
