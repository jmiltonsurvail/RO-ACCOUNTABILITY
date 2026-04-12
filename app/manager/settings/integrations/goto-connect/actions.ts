"use server";

import { ActivityType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import {
  getGoToConnectSettings,
  resolveGoToLineByExtension,
  resolveGoToLinesByExtensions,
  testGoToConnection,
} from "@/lib/goto-connect";
import { logActivity } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import {
  gotoConnectAdvisorExtensionSchema,
  gotoConnectSettingsSchema,
} from "@/lib/validation";

export type GoToConnectSettingsActionState = {
  error?: string;
  success?: string;
};

export type GoToConnectConnectionTestActionState = {
  error?: string;
  success?: string;
};

async function reResolveAdvisorLines(input: {
  accountKey: string | null;
  accessToken: string | null;
  organizationId: string;
}) {
  const advisors = await prisma.user.findMany({
    where: {
      gotoConnectExtension: {
        not: null,
      },
      organizationId: input.organizationId,
      role: Role.ADVISOR,
    },
    select: {
      gotoConnectExtension: true,
      gotoConnectLineId: true,
      id: true,
    },
  });

  const lineMap = await resolveGoToLinesByExtensions({
    accessToken: input.accessToken,
    accountKey: input.accountKey,
    extensions: advisors.map((advisor) => advisor.gotoConnectExtension),
  });

  let updatedCount = 0;
  let unresolvedCount = 0;

  await prisma.$transaction(
    advisors.map((advisor) => {
      const extension = advisor.gotoConnectExtension?.trim() ?? null;
      const resolvedLine = extension ? lineMap.get(extension) : null;
      const nextLineId = resolvedLine?.lineId ?? null;

      if (nextLineId !== advisor.gotoConnectLineId) {
        updatedCount += 1;
      }

      if (extension && !nextLineId) {
        unresolvedCount += 1;
      }

      return prisma.user.update({
        where: {
          id: advisor.id,
        },
        data: {
          gotoConnectLineId: nextLineId,
        },
      });
    }),
  );

  return {
    advisorCount: advisors.length,
    unresolvedCount,
    updatedCount,
  };
}

export async function updateGoToConnectSettingsAction(
  _previousState: GoToConnectSettingsActionState,
  formData: FormData,
): Promise<GoToConnectSettingsActionState> {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);

  const parsed = gotoConnectSettingsSchema.safeParse({
    accountKey: formData.get("accountKey"),
    accessToken: formData.get("accessToken"),
    autoAnswer: formData.get("autoAnswer") ?? "false",
    clientId: formData.get("clientId"),
    clientSecret: formData.get("clientSecret"),
    enabled: formData.get("enabled") ?? "false",
    launchUrlTemplate: formData.get("launchUrlTemplate"),
    organizationId: formData.get("organizationId"),
    phoneNumberId: formData.get("phoneNumberId"),
  });

  if (!parsed.success) {
    return { error: "Enter valid GoTo settings before saving." };
  }

  const existing = await prisma.goToConnectSettings.findUnique({
    where: { organizationId },
  });

  const nextAccessToken = parsed.data.accessToken ?? existing?.accessToken ?? null;
  const nextAccountKey = parsed.data.accountKey ?? null;
  const lookupInputsChanged =
    nextAccessToken !== (existing?.accessToken ?? null) ||
    nextAccountKey !== (existing?.accountKey ?? null);

  await prisma.goToConnectSettings.upsert({
    create: {
      accountKey: parsed.data.accountKey ?? null,
      accessToken: parsed.data.accessToken ?? null,
      autoAnswer: parsed.data.autoAnswer,
      clientId: parsed.data.clientId ?? null,
      clientSecret: parsed.data.clientSecret ?? null,
      enabled: parsed.data.enabled,
      launchUrlTemplate: parsed.data.launchUrlTemplate ?? null,
      goToOrganizationId: parsed.data.organizationId ?? null,
      organizationId,
      phoneNumberId: parsed.data.phoneNumberId ?? null,
    },
    update: {
      accountKey: parsed.data.accountKey ?? null,
      accessToken: parsed.data.accessToken ?? existing?.accessToken ?? null,
      autoAnswer: parsed.data.autoAnswer,
      clientId: parsed.data.clientId ?? null,
      clientSecret:
        parsed.data.clientSecret ?? existing?.clientSecret ?? null,
      enabled: parsed.data.enabled,
      launchUrlTemplate: parsed.data.launchUrlTemplate ?? null,
      goToOrganizationId: parsed.data.organizationId ?? null,
      phoneNumberId: parsed.data.phoneNumberId ?? null,
    },
    where: { organizationId },
  });

  let reResolvedSummary:
    | {
        advisorCount: number;
        unresolvedCount: number;
        updatedCount: number;
      }
    | null = null;

  if (lookupInputsChanged && nextAccessToken && nextAccountKey) {
    reResolvedSummary = await reResolveAdvisorLines({
      accessToken: nextAccessToken,
      accountKey: nextAccountKey,
      organizationId,
    });
  }

  await logActivity({
    message: "Updated GoTo Connect settings.",
    metadata: {
      autoAnswer: parsed.data.autoAnswer,
      changedFields: {
        accessToken: nextAccessToken !== (existing?.accessToken ?? null),
        accountKey: nextAccountKey !== (existing?.accountKey ?? null),
        clientId: (parsed.data.clientId ?? null) !== (existing?.clientId ?? null),
        clientSecret:
          (parsed.data.clientSecret ?? existing?.clientSecret ?? null) !==
          (existing?.clientSecret ?? null),
        enabled: parsed.data.enabled !== (existing?.enabled ?? false),
        organizationId:
          (parsed.data.organizationId ?? null) !== (existing?.goToOrganizationId ?? null),
        phoneNumberId:
          (parsed.data.phoneNumberId ?? null) !== (existing?.phoneNumberId ?? null),
      },
      reResolvedSummary,
    },
    type: ActivityType.GOTO_CONNECT_SETTINGS_UPDATED,
    userId: session.user.id,
  });

  revalidatePath("/manager/settings");
  revalidatePath("/manager/settings/integrations");
  revalidatePath("/manager/settings/integrations/goto-connect");

  return {
    success: reResolvedSummary
      ? `GoTo Connect settings saved. Re-resolved ${reResolvedSummary.updatedCount} advisor line mappings.`
      : "GoTo Connect settings saved.",
  };
}

export async function testGoToConnectSettingsAction(
  _previousState: GoToConnectConnectionTestActionState,
  formData: FormData,
): Promise<GoToConnectConnectionTestActionState> {
  await requireRole([Role.MANAGER]);

  const parsed = gotoConnectSettingsSchema.safeParse({
    accountKey: formData.get("accountKey"),
    accessToken: formData.get("accessToken"),
    autoAnswer: formData.get("autoAnswer") ?? "false",
    clientId: formData.get("clientId"),
    clientSecret: formData.get("clientSecret"),
    enabled: formData.get("enabled") ?? "false",
    launchUrlTemplate: formData.get("launchUrlTemplate"),
    organizationId: formData.get("organizationId"),
    phoneNumberId: formData.get("phoneNumberId"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid Account Key and Access Token to test GoTo Connect." };
  }

  const testExtensionValue = formData.get("testExtension");
  const testExtension =
    typeof testExtensionValue === "string" && testExtensionValue.trim().length > 0
      ? testExtensionValue.trim()
      : null;

  const result = await testGoToConnection({
    accessToken: parsed.data.accessToken ?? null,
    accountKey: parsed.data.accountKey ?? null,
    extension: testExtension,
  });

  if (!result.ok) {
    return { error: result.message };
  }

  return { success: result.message };
}

export async function updateGoToConnectAdvisorExtensionAction(formData: FormData) {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);

  const parsed = gotoConnectAdvisorExtensionSchema.safeParse({
    gotoConnectExtension: formData.get("gotoConnectExtension"),
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return;
  }

  const settings = await getGoToConnectSettings(organizationId);
  const existingAdvisor = await prisma.user.findFirst({
    where: {
      id: parsed.data.userId,
      organizationId,
    },
    select: {
      asmNumber: true,
      gotoConnectExtension: true,
      gotoConnectLineId: true,
      id: true,
    },
  });

  if (!existingAdvisor) {
    return;
  }

  const resolvedLine = await resolveGoToLineByExtension({
    accessToken: settings.accessToken,
    accountKey: settings.accountKey,
    extension: parsed.data.gotoConnectExtension ?? null,
  });

  await prisma.user.update({
    where: { id: existingAdvisor.id },
    data: {
      gotoConnectExtension: parsed.data.gotoConnectExtension ?? null,
      gotoConnectLineId: resolvedLine?.lineId ?? null,
    },
  });

  await logActivity({
    message: `Updated GoTo line mapping for ASM ${existingAdvisor.asmNumber}.`,
    metadata: {
      asmNumber: existingAdvisor.asmNumber,
      previousExtension: existingAdvisor.gotoConnectExtension,
      previousLineId: existingAdvisor.gotoConnectLineId,
      resolvedLineId: resolvedLine?.lineId ?? null,
      resolvedLineName: resolvedLine?.lineName ?? null,
      updatedExtension: parsed.data.gotoConnectExtension ?? null,
    },
    type: ActivityType.GOTO_CONNECT_LINE_MAPPING_UPDATED,
    userId: session.user.id,
  });

  revalidatePath("/manager/settings/integrations/goto-connect");
}

export async function reResolveGoToConnectAdvisorExtensionsAction() {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const settings = await getGoToConnectSettings(organizationId);

  if (!settings.accessToken || !settings.accountKey) {
    return;
  }

  const summary = await reResolveAdvisorLines({
    accessToken: settings.accessToken,
    accountKey: settings.accountKey,
    organizationId,
  });

  await logActivity({
    message: "Re-resolved GoTo advisor line mappings.",
    metadata: summary,
    type: ActivityType.GOTO_CONNECT_LINE_MAPPINGS_RERESOLVED,
    userId: session.user.id,
  });

  revalidatePath("/manager/settings/integrations/goto-connect");
}
