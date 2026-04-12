"use server";

import { ActivityType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import {
  getGoToConnectSettings,
  getGoToConnectSettingsWithAccessToken,
  resolveGoToAccount,
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

async function upsertGoToClientSettings(input: {
  autoAnswer: boolean;
  clientId: string | null;
  clientSecret: string | null;
  enabled: boolean;
  organizationId: string;
  phoneNumberId: string | null;
}) {
  const existing = await prisma.goToConnectSettings.findUnique({
    where: { organizationId: input.organizationId },
  });

  const result = await prisma.goToConnectSettings.upsert({
    create: {
      accessToken: existing?.accessToken ?? null,
      accessTokenExpiresAt: existing?.accessTokenExpiresAt ?? null,
      accountKey: existing?.accountKey ?? null,
      accountName: existing?.accountName ?? null,
      autoAnswer: input.autoAnswer,
      clientId: input.clientId ?? existing?.clientId ?? null,
      clientSecret: input.clientSecret ?? existing?.clientSecret ?? null,
      connectedAt: existing?.connectedAt ?? null,
      enabled: input.enabled,
      goToOrganizationId: existing?.goToOrganizationId ?? null,
      organizationId: input.organizationId,
      phoneNumberId: input.phoneNumberId,
      refreshToken: existing?.refreshToken ?? null,
    },
    update: {
      autoAnswer: input.autoAnswer,
      clientId: input.clientId ?? existing?.clientId ?? null,
      clientSecret: input.clientSecret ?? existing?.clientSecret ?? null,
      enabled: input.enabled,
      phoneNumberId: input.phoneNumberId,
    },
    where: { organizationId: input.organizationId },
  });

  return {
    existing,
    settings: result,
  };
}

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
    accessToken: null,
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

  const { existing } = await upsertGoToClientSettings({
    autoAnswer: parsed.data.autoAnswer,
    clientId: parsed.data.clientId ?? null,
    clientSecret: parsed.data.clientSecret ?? null,
    enabled: parsed.data.enabled,
    organizationId,
    phoneNumberId: parsed.data.phoneNumberId ?? null,
  });

  const resolvedAccount = await resolveGoToAccount({
    accessToken: existing?.accessToken ?? null,
    accountKey: parsed.data.accountKey ?? existing?.accountKey ?? null,
  });

  if (!existing?.accessToken) {
    revalidatePath("/manager/settings/integrations/goto-connect");
    return {
      success:
        "OAuth settings saved. Click Connect GoTo to authorize the app and pull the account details.",
    };
  }

  if (resolvedAccount.error || !resolvedAccount.account) {
    return {
      error:
        resolvedAccount.error ??
        "GoTo authorization is saved, but the account could not be resolved.",
    };
  }

  const nextAccessToken = existing.accessToken;
  const nextAccountKey = resolvedAccount.account.key;
  const lookupInputsChanged =
    nextAccessToken !== (existing?.accessToken ?? null) ||
    nextAccountKey !== (existing?.accountKey ?? null);

  await prisma.goToConnectSettings.update({
    where: { organizationId },
    data: {
      accountKey: nextAccountKey,
      accountName: resolvedAccount.account.name,
      autoAnswer: parsed.data.autoAnswer,
      enabled: parsed.data.enabled,
      phoneNumberId: parsed.data.phoneNumberId ?? null,
    },
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
        enabled: parsed.data.enabled !== (existing?.enabled ?? false),
        phoneNumberId:
          (parsed.data.phoneNumberId ?? null) !== (existing?.phoneNumberId ?? null),
      },
      resolvedAccountName: resolvedAccount.account.name,
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
      ? `GoTo Connect settings saved for account ${nextAccountKey}. Re-resolved ${reResolvedSummary.updatedCount} advisor line mappings.`
      : `GoTo Connect settings saved for account ${nextAccountKey}.`,
  };
}

export async function testGoToConnectSettingsAction(
  _previousState: GoToConnectConnectionTestActionState,
  formData: FormData,
): Promise<GoToConnectConnectionTestActionState> {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);

  const parsed = gotoConnectSettingsSchema.safeParse({
    accountKey: formData.get("accountKey"),
    accessToken: null,
    autoAnswer: formData.get("autoAnswer") ?? "false",
    clientId: formData.get("clientId"),
    clientSecret: formData.get("clientSecret"),
    enabled: formData.get("enabled") ?? "false",
    launchUrlTemplate: formData.get("launchUrlTemplate"),
    organizationId: formData.get("organizationId"),
    phoneNumberId: formData.get("phoneNumberId"),
  });

  if (!parsed.success) {
    return { error: "Enter valid GoTo settings before testing." };
  }

  const { settings } = await upsertGoToClientSettings({
    autoAnswer: parsed.data.autoAnswer,
    clientId: parsed.data.clientId ?? null,
    clientSecret: parsed.data.clientSecret ?? null,
    enabled: parsed.data.enabled,
    organizationId,
    phoneNumberId: parsed.data.phoneNumberId ?? null,
  });

  const runtimeSettings = await getGoToConnectSettingsWithAccessToken(organizationId);

  if (!runtimeSettings.accessToken) {
    return { error: "Click Connect GoTo first so the app can obtain an access token." };
  }

  const testExtensionValue = formData.get("testExtension");
  const testExtension =
    typeof testExtensionValue === "string" && testExtensionValue.trim().length > 0
      ? testExtensionValue.trim()
      : null;

  const result = await testGoToConnection({
    accessToken: runtimeSettings.accessToken,
    accountKey: parsed.data.accountKey ?? settings.accountKey ?? null,
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
  const runtimeSettings = await getGoToConnectSettingsWithAccessToken(organizationId);
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
    accessToken: runtimeSettings.accessToken,
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
  const settings = await getGoToConnectSettingsWithAccessToken(organizationId);

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

export async function connectGoToOauthAction(
  _previousState: GoToConnectSettingsActionState,
  formData: FormData,
): Promise<GoToConnectSettingsActionState> {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);

  const parsed = gotoConnectSettingsSchema.safeParse({
    accountKey: formData.get("accountKey"),
    accessToken: null,
    autoAnswer: formData.get("autoAnswer") ?? "false",
    clientId: formData.get("clientId"),
    clientSecret: formData.get("clientSecret"),
    enabled: formData.get("enabled") ?? "false",
    launchUrlTemplate: null,
    organizationId: null,
    phoneNumberId: formData.get("phoneNumberId"),
  });

  if (!parsed.success || !parsed.data.clientId || !parsed.data.clientSecret) {
    return { error: "Enter the GoTo OAuth Client ID and Client Secret before connecting." };
  }

  await upsertGoToClientSettings({
    autoAnswer: parsed.data.autoAnswer,
    clientId: parsed.data.clientId,
    clientSecret: parsed.data.clientSecret,
    enabled: parsed.data.enabled,
    organizationId,
    phoneNumberId: parsed.data.phoneNumberId ?? null,
  });

  redirect("/api/goto-connect/oauth/start");
}
