"use server";

import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { alertRuleSchema } from "@/lib/validation";

export type AlertRuleActionState = {
  error?: string;
  success?: string;
};

export async function updateAlertRuleAction(
  previousState: AlertRuleActionState = {},
  formData: FormData,
): Promise<AlertRuleActionState> {
  void previousState;
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);

  const parsed = alertRuleSchema.safeParse({
    enabled: formData.get("enabled") ?? "false",
    name: formData.get("name"),
    ruleId: formData.get("ruleId"),
    trigger: formData.get("trigger"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the alert rule and try again.",
    };
  }

  try {
    await prisma.alertRule.update({
      data: {
        enabled: parsed.data.enabled,
        name: parsed.data.name,
      },
      where: {
        organizationId_trigger: {
          organizationId,
          trigger: parsed.data.trigger,
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { error: "Unable to update that alert rule." };
    }

    return { error: "Unable to update that alert rule." };
  }

  revalidatePath("/manager");
  revalidatePath("/manager/alerts");
  revalidatePath("/manager/reports");
  revalidatePath("/manager/settings");
  revalidatePath("/manager/settings/alerts");

  return {
    success: "Alert rule updated.",
  };
}
