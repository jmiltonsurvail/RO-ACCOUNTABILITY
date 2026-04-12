"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slaSettingsSchema } from "@/lib/validation";

export type SlaSettingsActionState = {
  error?: string;
  success?: string;
};

export async function updateSlaSettingsAction(
  previousState: SlaSettingsActionState = {},
  formData: FormData,
): Promise<SlaSettingsActionState> {
  void previousState;
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);

  const parsed = slaSettingsSchema.safeParse({
    blockedAgingHours: formData.get("blockedAgingHours"),
    contactSlaHours: formData.get("contactSlaHours"),
    dueSoonHours: formData.get("dueSoonHours"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the SLA values and try again.",
    };
  }

  await prisma.slaSettings.upsert({
    create: {
      blockedAgingHours: parsed.data.blockedAgingHours,
      contactSlaHours: parsed.data.contactSlaHours,
      dueSoonHours: parsed.data.dueSoonHours,
      organizationId,
    },
    update: {
      blockedAgingHours: parsed.data.blockedAgingHours,
      contactSlaHours: parsed.data.contactSlaHours,
      dueSoonHours: parsed.data.dueSoonHours,
    },
    where: {
      organizationId,
    },
  });

  revalidatePath("/advisor");
  revalidatePath("/dispatcher");
  revalidatePath("/manager");
  revalidatePath("/manager/reports");
  revalidatePath("/manager/settings");
  revalidatePath("/manager/settings/sla");

  return {
    success: "SLA settings updated.",
  };
}
