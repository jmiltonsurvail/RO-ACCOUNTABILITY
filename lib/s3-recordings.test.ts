import { describe, expect, it } from "vitest";
import {
  extractGoToInitiatorIdFromObjectKey,
  parseS3RecordingEvent,
} from "./s3-recordings";

describe("s3 recording helpers", () => {
  it("extracts the GoTo call identifier from standard GoTo recording file names", () => {
    expect(
      extractGoToInitiatorIdFromObjectKey(
        "raw/goto/2026/04/12/1712900000~3215551212~3215553434~call-abc-123.wav",
      ),
    ).toBe("call-abc-123");
  });

  it("parses and decodes S3 event records", () => {
    expect(
      parseS3RecordingEvent({
        Records: [
          {
            eventName: "ObjectCreated:Put",
            s3: {
              bucket: {
                name: "servicesyncnow-recordings",
              },
              object: {
                key: "raw%2Fgoto%2F1712900000~3215551212~3215553434~call-abc-123.wav",
              },
            },
          },
        ],
      }),
    ).toEqual([
      {
        bucket: "servicesyncnow-recordings",
        eventName: "ObjectCreated:Put",
        goToInitiatorId: "call-abc-123",
        key: "raw/goto/1712900000~3215551212~3215553434~call-abc-123.wav",
      },
    ]);
  });
});
