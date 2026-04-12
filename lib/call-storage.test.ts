import { describe, expect, it } from "vitest";
import {
  buildCallSessionStorageKeys,
  buildRawInboundRecordingObjectKey,
  getCallSessionStoragePrefix,
  getTenantStoragePrefix,
} from "./call-storage";

describe("call storage helpers", () => {
  it("builds a tenant-scoped call session prefix", () => {
    expect(
      getCallSessionStoragePrefix({
        callSessionId: "call_123",
        organizationId: "org_456",
        processedPrefix: "processed/calls/",
      }),
    ).toBe("processed/calls/tenant/org_456/calls/call_123");
  });

  it("returns stable recording and transcript object keys", () => {
    expect(
      buildCallSessionStorageKeys({
        callSessionId: "call_123",
        organizationId: "org_456",
        settings: {
          s3ProcessedCallsPrefix: "/processed/calls/",
          s3RawRecordingsPrefix: "raw/goto",
        },
      }),
    ).toEqual({
      processedRecordingObjectKey:
        "processed/calls/tenant/org_456/calls/call_123/recording.wav",
      rawInboundPrefix: "raw/goto/tenant/org_456/incoming",
      storagePrefix: "processed/calls/tenant/org_456/calls/call_123",
      transcriptJsonObjectKey:
        "processed/calls/tenant/org_456/calls/call_123/transcript.json",
      transcriptTextObjectKey:
        "processed/calls/tenant/org_456/calls/call_123/transcript.txt",
    });
  });

  it("sanitizes raw inbound file names", () => {
    expect(
      buildRawInboundRecordingObjectKey({
        fileName: "2026 04 12~123~456~abc.wav",
        organizationId: "org_456",
        settings: {
          s3RawRecordingsPrefix: "raw/goto",
        },
      }),
    ).toBe("raw/goto/tenant/org_456/incoming/2026-04-12-123-456-abc.wav");
  });

  it("exposes the tenant root prefix", () => {
    expect(getTenantStoragePrefix("org_456")).toBe("tenant/org_456");
  });
});
