import { ActivityType, RecordingProcessingStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { getPlatformIntegrationSettings } from "@/lib/platform-integrations";
import { prisma } from "@/lib/prisma";
import { processCallSessionRecording } from "@/lib/recording-transcription";
import { parseS3RecordingEvent } from "@/lib/s3-recordings";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.S3_RECORDING_INGEST_SECRET;
  const providedSecret = request.headers.get("x-recording-ingest-secret");

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "S3 recording ingest secret is not configured." },
      { status: 500 },
    );
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json();
  const records = parseS3RecordingEvent(payload);
  const settings = await getPlatformIntegrationSettings();

  let ignoredBucketCount = 0;
  let matchedCount = 0;
  let processedCount = 0;
  let processingFailureCount = 0;
  let unmatchedCount = 0;

  for (const record of records) {
    if (settings.s3Bucket && record.bucket !== settings.s3Bucket) {
      ignoredBucketCount += 1;
      continue;
    }

    if (!record.goToInitiatorId) {
      unmatchedCount += 1;
      continue;
    }

    const callSession = await prisma.callSession.findUnique({
      where: {
        goToInitiatorId: record.goToInitiatorId,
      },
      select: {
        id: true,
        repairOrderId: true,
      },
    });

    if (!callSession) {
      unmatchedCount += 1;
      continue;
    }

    await prisma.callSession.update({
      where: {
        id: callSession.id,
      },
      data: {
        lastError: null,
        rawRecordingObjectKey: record.key,
        recordingStatus: RecordingProcessingStatus.READY,
      },
    });

    await prisma.activityLog.create({
      data: {
        message: `Call recording received for GoTo call ${record.goToInitiatorId}.`,
        metadata: {
          bucket: record.bucket,
          callSessionId: callSession.id,
          eventName: record.eventName,
          goToInitiatorId: record.goToInitiatorId,
          rawRecordingObjectKey: record.key,
        },
        repairOrderId: callSession.repairOrderId,
        type: ActivityType.CALL_RECORDING_RECEIVED,
      },
    });

    const result = await processCallSessionRecording(callSession.id);

    if (result.status === "processed") {
      processedCount += 1;
    }

    if (result.status === "failed") {
      processingFailureCount += 1;
    }

    matchedCount += 1;
  }

  return NextResponse.json({
    ignoredBucketCount,
    matchedCount,
    processedCount,
    processingFailureCount,
    receivedCount: records.length,
    unmatchedCount,
  });
}
