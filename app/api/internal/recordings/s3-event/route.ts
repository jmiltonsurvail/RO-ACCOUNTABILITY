import { ActivityType, RecordingProcessingStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processCallSessionRecording } from "@/lib/recording-transcription";
import { parseS3RecordingEvent } from "@/lib/s3-recordings";

function normalizePhoneDigits(phone: string | null | undefined) {
  const digits = phone?.replace(/\D+/g, "").trim() ?? "";

  if (!digits) {
    return null;
  }

  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
}

function isSamePhone(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = normalizePhoneDigits(left);
  const normalizedRight = normalizePhoneDigits(right);

  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

async function findCallSessionForRecording(input: {
  bucket: string;
  customerPhoneDigits: string | null;
  goToCallSessionId: string | null;
  goToInitiatorId: string | null;
  recordedAt: Date | null;
}) {
  const identifiers = [input.goToCallSessionId, input.goToInitiatorId].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  if (identifiers.length > 0) {
    const matchedByIdentifier = await prisma.callSession.findFirst({
      orderBy: {
        requestedAt: "desc",
      },
      select: {
        id: true,
        organization: {
          select: {
            goToConnectSettings: {
              select: {
                recordingS3Bucket: true,
              },
            },
          },
        },
        repairOrderId: true,
      },
      where: {
        organization: {
          goToConnectSettings: {
            recordingS3Bucket: input.bucket,
          },
        },
        OR: identifiers.flatMap((identifier) => [
          { conversationSpaceId: identifier },
          { goToCallSessionId: identifier },
          { goToInitiatorId: identifier },
        ]),
      },
    });

    if (matchedByIdentifier) {
      return matchedByIdentifier;
    }
  }

  if (!input.customerPhoneDigits || !input.recordedAt) {
    return null;
  }

  const fallbackWindowStart = new Date(input.recordedAt.getTime() - 12 * 60 * 60 * 1000);
  const fallbackWindowEnd = new Date(input.recordedAt.getTime() + 2 * 60 * 60 * 1000);
  const candidateSessions = await prisma.callSession.findMany({
    orderBy: {
      requestedAt: "desc",
    },
    select: {
      customerPhone: true,
      id: true,
      organization: {
        select: {
          goToConnectSettings: {
            select: {
              recordingS3Bucket: true,
            },
          },
        },
      },
      repairOrderId: true,
      requestedAt: true,
    },
    where: {
      organization: {
        goToConnectSettings: {
          recordingS3Bucket: input.bucket,
        },
      },
      requestedAt: {
        gte: fallbackWindowStart,
        lte: fallbackWindowEnd,
      },
    },
  });

  return (
    candidateSessions.find((session) =>
      isSamePhone(session.customerPhone, input.customerPhoneDigits),
    ) ?? null
  );
}

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

  let ignoredBucketCount = 0;
  let matchedCount = 0;
  let processedCount = 0;
  let processingFailureCount = 0;
  let unmatchedCount = 0;

  for (const record of records) {
    if (!record.goToInitiatorId && !record.goToCallSessionId) {
      unmatchedCount += 1;
      continue;
    }

    const callSession = await findCallSessionForRecording({
      bucket: record.bucket,
      customerPhoneDigits: record.customerPhoneDigits,
      goToCallSessionId: record.goToCallSessionId,
      goToInitiatorId: record.goToInitiatorId,
      recordedAt: record.recordedAt,
    });

    if (!callSession) {
      unmatchedCount += 1;
      continue;
    }

    const expectedBucket =
      callSession.organization.goToConnectSettings?.recordingS3Bucket?.trim() ?? null;

    if (expectedBucket && expectedBucket !== record.bucket) {
      ignoredBucketCount += 1;
      continue;
    }

    await prisma.callSession.update({
      where: {
        id: callSession.id,
      },
      data: {
        ...(record.goToCallSessionId
          ? {
              goToCallSessionId: record.goToCallSessionId,
            }
          : {}),
        lastError: null,
        rawRecordingObjectKey: record.key,
        recordingStatus: RecordingProcessingStatus.READY,
        storageBucket: record.bucket,
      },
    });

    await prisma.activityLog.create({
      data: {
        message: `Call recording received for GoTo call ${record.goToInitiatorId}.`,
        metadata: {
          bucket: record.bucket,
          callSessionId: callSession.id,
          customerPhoneDigits: record.customerPhoneDigits,
          eventName: record.eventName,
          goToCallSessionId: record.goToCallSessionId,
          goToInitiatorId: record.goToInitiatorId,
          rawRecordingObjectKey: record.key,
          recordedAt: record.recordedAt?.toISOString() ?? null,
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
