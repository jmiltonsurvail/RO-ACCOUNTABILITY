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

function decodeS3ObjectKey(key: string) {
  return decodeURIComponent(key.replace(/\+/g, " "));
}

function getFileNameFromObjectKey(key: string) {
  const normalizedKey = decodeS3ObjectKey(key);
  return normalizedKey.split("/").at(-1) ?? normalizedKey;
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

      return {
        bucket,
        eventName: record.eventName ?? null,
        goToInitiatorId: extractGoToInitiatorIdFromObjectKey(key),
        key,
      };
    })
    .filter(
      (
        record,
      ): record is {
        bucket: string;
        eventName: string | null;
        goToInitiatorId: string | null;
        key: string;
      } => Boolean(record),
    );
}
