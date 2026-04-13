import { prisma } from "@/lib/prisma";

export type RecordingStorageSettings = {
  awsRegion: string | null;
  s3Bucket: string | null;
};

export async function getRecordingStorageSettings(
  organizationId: string,
): Promise<RecordingStorageSettings> {
  const [goToSettings, platformSettings] = await Promise.all([
    prisma.goToConnectSettings.findUnique({
      where: {
        organizationId,
      },
      select: {
        recordingAwsRegion: true,
        recordingS3Bucket: true,
      },
    }),
    prisma.platformIntegrationSettings.findUnique({
      where: {
        id: "default",
      },
      select: {
        awsRegion: true,
        s3Bucket: true,
      },
    }),
  ]);

  return {
    awsRegion: goToSettings?.recordingAwsRegion ?? platformSettings?.awsRegion ?? null,
    s3Bucket: goToSettings?.recordingS3Bucket ?? platformSettings?.s3Bucket ?? null,
  };
}
