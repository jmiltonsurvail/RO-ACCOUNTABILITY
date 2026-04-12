import type { PlatformIntegrationSettingsValues } from "@/lib/platform-integrations";

type BuildCallSessionStorageKeysInput = {
  callSessionId: string;
  organizationId: string;
  settings?: Pick<
    PlatformIntegrationSettingsValues,
    "s3ProcessedCallsPrefix" | "s3RawRecordingsPrefix"
  >;
};

function normalizePrefix(prefix: string | null | undefined, fallback: string) {
  const normalized = (prefix ?? fallback).trim().replace(/^\/+|\/+$/g, "");
  return normalized.length > 0 ? normalized : fallback;
}

function sanitizeFileNameSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getTenantStoragePrefix(organizationId: string) {
  return `tenant/${organizationId}`;
}

export function getCallSessionStoragePrefix(input: {
  callSessionId: string;
  organizationId: string;
  processedPrefix?: string | null;
}) {
  const processedPrefix = normalizePrefix(
    input.processedPrefix,
    "calls/processed",
  );

  return `${processedPrefix}/${getTenantStoragePrefix(input.organizationId)}/calls/${input.callSessionId}`;
}

export function buildCallSessionStorageKeys(
  input: BuildCallSessionStorageKeysInput,
) {
  const storagePrefix = getCallSessionStoragePrefix({
    callSessionId: input.callSessionId,
    organizationId: input.organizationId,
    processedPrefix: input.settings?.s3ProcessedCallsPrefix,
  });

  const rawPrefix = normalizePrefix(
    input.settings?.s3RawRecordingsPrefix,
    "calls/raw",
  );

  return {
    rawInboundPrefix: `${rawPrefix}/${getTenantStoragePrefix(input.organizationId)}/incoming`,
    storagePrefix,
    processedRecordingObjectKey: `${storagePrefix}/recording.wav`,
    transcriptJsonObjectKey: `${storagePrefix}/transcript.json`,
    transcriptTextObjectKey: `${storagePrefix}/transcript.txt`,
  };
}

export function buildRawInboundRecordingObjectKey(input: {
  fileName: string;
  organizationId: string;
  settings?: Pick<PlatformIntegrationSettingsValues, "s3RawRecordingsPrefix">;
}) {
  const rawPrefix = normalizePrefix(
    input.settings?.s3RawRecordingsPrefix,
    "calls/raw",
  );

  const fileName = sanitizeFileNameSegment(input.fileName) || "recording.wav";

  return `${rawPrefix}/${getTenantStoragePrefix(input.organizationId)}/incoming/${fileName}`;
}
