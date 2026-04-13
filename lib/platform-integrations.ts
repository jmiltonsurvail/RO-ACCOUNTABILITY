import { prisma } from "@/lib/prisma";

export type PlatformIntegrationSettingsValues = {
  awsRegion: string | null;
  awsProvisioningAccessKeyId: string | null;
  awsProvisioningSecretAccessKey: string | null;
  openAiApiKey: string | null;
  openAiTranscriptionModel: string | null;
  s3Bucket: string | null;
  s3ProcessedCallsPrefix: string | null;
  s3RawRecordingsPrefix: string | null;
};

export const defaultPlatformIntegrationSettings: PlatformIntegrationSettingsValues = {
  awsRegion: null,
  awsProvisioningAccessKeyId: null,
  awsProvisioningSecretAccessKey: null,
  openAiApiKey: null,
  openAiTranscriptionModel: null,
  s3Bucket: null,
  s3ProcessedCallsPrefix: null,
  s3RawRecordingsPrefix: null,
};

export async function getPlatformIntegrationSettings(): Promise<PlatformIntegrationSettingsValues> {
  const settings = await prisma.platformIntegrationSettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    return defaultPlatformIntegrationSettings;
  }

  return {
    awsRegion: settings.awsRegion,
    awsProvisioningAccessKeyId: settings.awsProvisioningAccessKeyId,
    awsProvisioningSecretAccessKey: settings.awsProvisioningSecretAccessKey,
    openAiApiKey: settings.openAiApiKey,
    openAiTranscriptionModel: settings.openAiTranscriptionModel,
    s3Bucket: settings.s3Bucket,
    s3ProcessedCallsPrefix: settings.s3ProcessedCallsPrefix,
    s3RawRecordingsPrefix: settings.s3RawRecordingsPrefix,
  };
}
