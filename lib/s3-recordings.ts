type S3EventNotification = {
  Records?: Array<{
    eventName?: string;
    s3?: {
      bucket?: {
        name?: string;
      };
      object?: {
        key?: string;
      };
    };
  }>;
};

type ParsedGoToRecordingIdentifiers = {
  customerPhoneDigits: string | null;
  goToCallSessionId: string | null;
  goToInitiatorId: string | null;
  recordedAt: Date | null;
};

function decodeS3ObjectKey(key: string) {
  return decodeURIComponent(key.replace(/\+/g, " "));
}

function getFileNameFromObjectKey(key: string) {
  const normalizedKey = decodeS3ObjectKey(key);
  return normalizedKey.split("/").at(-1) ?? normalizedKey;
}

function parseGoToRecordingIdentifiersFromFileName(fileName: string): ParsedGoToRecordingIdentifiers {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const segments = withoutExtension.split("~").map((segment) => segment.trim());
  const timestampSegment = segments[0] ?? null;
  const goToCallSessionId = segments[1] || null;
  const customerPhoneDigits =
    segments[2]?.replace(/\D+/g, "").trim() || null;
  const goToInitiatorId = segments.at(-1) || null;

  const recordedAt =
    timestampSegment && !Number.isNaN(new Date(timestampSegment).getTime())
      ? new Date(timestampSegment)
      : null;

  return {
    customerPhoneDigits: customerPhoneDigits && customerPhoneDigits.length > 0
      ? customerPhoneDigits
      : null,
    goToCallSessionId:
      goToCallSessionId && goToCallSessionId.length > 0 ? goToCallSessionId : null,
    goToInitiatorId:
      goToInitiatorId && goToInitiatorId.length > 0 ? goToInitiatorId : null,
    recordedAt,
  };
}

export function extractGoToInitiatorIdFromObjectKey(key: string) {
  const fileName = getFileNameFromObjectKey(key);
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");

  if (withoutExtension.includes("~")) {
    const candidate = withoutExtension.split("~").at(-1)?.trim() ?? null;
    return candidate && candidate.length > 0 ? candidate : null;
  }

  const callMatch = withoutExtension.match(/call[_-]([A-Za-z0-9-]+)/i);

  if (callMatch?.[1]) {
    return callMatch[1];
  }

  return null;
}

export function parseS3RecordingEvent(event: unknown) {
  const payload = event as S3EventNotification;

  return (payload.Records ?? [])
    .map((record) => {
      const bucket = record.s3?.bucket?.name ?? null;
      const key = record.s3?.object?.key ? decodeS3ObjectKey(record.s3.object.key) : null;

      if (!bucket || !key) {
        return null;
      }

      const fileName = getFileNameFromObjectKey(key);
      const parsedIdentifiers = parseGoToRecordingIdentifiersFromFileName(fileName);

      return {
        bucket,
        customerPhoneDigits: parsedIdentifiers.customerPhoneDigits,
        eventName: record.eventName ?? null,
        goToCallSessionId: parsedIdentifiers.goToCallSessionId,
        goToInitiatorId:
          parsedIdentifiers.goToInitiatorId ?? extractGoToInitiatorIdFromObjectKey(key),
        key,
        recordedAt: parsedIdentifiers.recordedAt,
      };
    })
    .filter(
      (
        record,
      ): record is {
        bucket: string;
        customerPhoneDigits: string | null;
        eventName: string | null;
        goToCallSessionId: string | null;
        goToInitiatorId: string | null;
        key: string;
        recordedAt: Date | null;
      } => Boolean(record),
    );
}
