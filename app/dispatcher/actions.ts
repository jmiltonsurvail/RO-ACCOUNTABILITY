"use server";

import { ActivityType, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blockerFormSchema, clearBlockerSchema } from "@/lib/validation";

export type ActionState = {
  error?: string;
  success?: string;
};

const initialState: ActionState = {};

function parseDateInput(value: string | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function saveBlockerAction(
  previousState: ActionState = initialState,
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const session = await requireRole([Role.DISPATCHER, Role.MANAGER]);
  const parsed = blockerFormSchema.safeParse({
    blockerReason: formData.get("blockerReason"),
    fallbackAsmNumber: formData.get("fallbackAsmNumber"),
    fallbackCustomerName: formData.get("fallbackCustomerName"),
    fallbackModel: formData.get("fallbackModel"),
    fallbackYear: formData.get("fallbackYear"),
    foremanNotes: formData.get("foremanNotes"),
    roNumber: formData.get("roNumber"),
    techPromisedDate: formData.get("techPromisedDate"),
  });

  if (!parsed.success) {
    return { error: "Check the dispatcher form inputs and try again." };
  }

  const techPromisedDate = parseDateInput(parsed.data.techPromisedDate);

  await prisma.$transaction(async (transaction) => {
    let repairOrder = await transaction.repairOrder.findUnique({
      where: { roNumber: parsed.data.roNumber },
      include: {
        blockerState: true,
        contactState: true,
      },
    });

    if (!repairOrder) {
      if (
        !parsed.data.fallbackAsmNumber ||
        !parsed.data.fallbackCustomerName ||
        !parsed.data.fallbackModel ||
        !parsed.data.fallbackYear
      ) {
        throw new Error("Missing manual-entry fields for a new RO.");
      }

      repairOrder = await transaction.repairOrder.create({
        data: {
          asmNumber: parsed.data.fallbackAsmNumber,
          customerName: parsed.data.fallbackCustomerName,
          isActive: true,
          lastImportBatchId: null,
          mode: "Manual Entry",
          model: parsed.data.fallbackModel,
          phone: null,
          promisedAtNormalized: techPromisedDate,
          promisedRaw: parsed.data.techPromisedDate?.trim() || "Manual Entry",
          rawSourceData: {
            createdByRole: "DISPATCHER",
            source: "manual-fallback",
          } satisfies Prisma.InputJsonValue,
          roNumber: parsed.data.roNumber,
          tag: null,
          techNumber: null,
          ttDisplayRaw: null,
          ttRaw: null,
          mtDisplayRaw: null,
          mtRaw: null,
          flags: null,
          year: parsed.data.fallbackYear,
        },
        include: {
          blockerState: true,
          contactState: true,
        },
      });
    }

    const blockerState = repairOrder.blockerState;
    const blockerStartedAt = blockerState?.isBlocked
      ? blockerState.blockerStartedAt
      : new Date();

    await transaction.blockerState.upsert({
      where: { repairOrderId: repairOrder.id },
      update: {
        blockerReason: parsed.data.blockerReason,
        dispatcherUserId: session.user.id,
        foremanNotes: parsed.data.foremanNotes || null,
        isBlocked: true,
        blockerStartedAt,
        techPromisedDate,
      },
      create: {
        blockerReason: parsed.data.blockerReason,
        dispatcherUserId: session.user.id,
        foremanNotes: parsed.data.foremanNotes || null,
        isBlocked: true,
        blockerStartedAt,
        repairOrderId: repairOrder.id,
        techPromisedDate,
      },
    });

    const resetContact = Boolean(repairOrder.contactState?.contacted);

    await transaction.contactState.upsert({
      where: { repairOrderId: repairOrder.id },
      update: {
        advisorUserId: repairOrder.contactState?.advisorUserId ?? null,
        contacted: false,
        contactedAt: null,
      },
      create: {
        contacted: false,
        contactedAt: null,
        customerNotes: null,
        repairOrderId: repairOrder.id,
      },
    });

    await transaction.activityLog.create({
      data: {
        message: `Blocker set to ${parsed.data.blockerReason}.`,
        metadata: {
          blockerReason: parsed.data.blockerReason,
          foremanNotes: parsed.data.foremanNotes || null,
          techPromisedDate: techPromisedDate?.toISOString() ?? null,
        } satisfies Prisma.InputJsonValue,
        repairOrderId: repairOrder.id,
        type: ActivityType.BLOCKER_UPSERTED,
        userId: session.user.id,
      },
    });

    if (resetContact) {
      await transaction.activityLog.create({
        data: {
          message: "Customer contact reset after blocker update.",
          repairOrderId: repairOrder.id,
          type: ActivityType.CONTACT_RESET,
          userId: session.user.id,
        },
      });
    }
  });

  revalidatePath("/dispatcher");
  revalidatePath("/manager");
  revalidatePath("/manager/reports");

  return { success: `Saved blocker for RO ${parsed.data.roNumber}.` };
}

export async function clearBlockerAction(
  previousState: ActionState = initialState,
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const session = await requireRole([Role.DISPATCHER, Role.MANAGER]);
  const parsed = clearBlockerSchema.safeParse({
    roNumber: formData.get("roNumber"),
  });

  if (!parsed.success) {
    return { error: "Missing RO number." };
  }

  const repairOrder = await prisma.repairOrder.findUnique({
    where: { roNumber: parsed.data.roNumber },
    include: { blockerState: true },
  });

  if (!repairOrder?.blockerState) {
    return { error: `RO ${parsed.data.roNumber} does not have an active blocker.` };
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.blockerState.update({
      where: { repairOrderId: repairOrder.id },
      data: {
        isBlocked: false,
      },
    });

    await transaction.activityLog.create({
      data: {
        message: "Blocker cleared.",
        repairOrderId: repairOrder.id,
        type: ActivityType.BLOCKER_CLEARED,
        userId: session.user.id,
      },
    });
  });

  revalidatePath("/dispatcher");
  revalidatePath("/manager");
  revalidatePath("/advisor");
  revalidatePath("/manager/reports");

  return { success: `Cleared blocker for RO ${parsed.data.roNumber}.` };
}
