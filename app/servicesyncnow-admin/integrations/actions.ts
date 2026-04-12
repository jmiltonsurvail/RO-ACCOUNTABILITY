"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { platformIntegrationSettingsSchema } from "@/lib/validation";

export type PlatformIntegrationSettingsActionState = {
  error?: string;
  success?: string;
};

export async function updatePlatformIntegrationSettingsAction(
  previousState: PlatformIntegrationSettingsActionState = {},
  formData: FormData,
): Promise<PlatformIntegrationSettingsActionState> {
  void previousState;
  await requireRole([Role.SERVICE_SYNCNOW_ADMIN]);

  const parsed = platformIntegrationSettingsSchema.safeParse({
    awsRegion: formData.get("awsRegion"),
    openAiApiKey: formData.get("openAiApiKey"),
    openAiTranscriptionModel: formData.get("openAiTranscriptionModel"),
    s3Bucket: formData.get("s3Bucket"),
    s3ProcessedCallsPrefix: formData.get("s3ProcessedCallsPrefix"),
    s3RawRecordingsPrefix: formData.get("s3RawRecordingsPrefix"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the integration settings and try again.",
    };
  }

  const existing = await prisma.platformIntegrationSettings.findUnique({
    where: { id: "default" },
  });

  await prisma.platformIntegrationSettings.upsert({
    where: { id: "default" },
    create: {
      awsRegion: parsed.data.awsRegion ?? null,
      id: "default",
      openAiApiKey: parsed.data.openAiApiKey ?? null,
      openAiTranscriptionModel: parsed.data.openAiTranscriptionModel ?? null,
      s3Bucket: parsed.data.s3Bucket ?? null,
      s3ProcessedCallsPrefix: parsed.data.s3ProcessedCallsPrefix ?? null,
      s3RawRecordingsPrefix: parsed.data.s3RawRecordingsPrefix ?? null,
    },
    update: {
      awsRegion: parsed.data.awsRegion ?? null,
      openAiApiKey: parsed.data.openAiApiKey ?? existing?.openAiApiKey ?? null,
      openAiTranscriptionModel: parsed.data.openAiTranscriptionModel ?? null,
      s3Bucket: parsed.data.s3Bucket ?? null,
      s3ProcessedCallsPrefix: parsed.data.s3ProcessedCallsPrefix ?? null,
      s3RawRecordingsPrefix: parsed.data.s3RawRecordingsPrefix ?? null,
    },
  });

  revalidatePath("/servicesyncnow-admin/integrations");

  return {
    success: "Platform integration settings updated.",
  };
}
