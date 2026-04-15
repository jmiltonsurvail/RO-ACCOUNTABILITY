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
        customerPhoneDigits: "3215553434",
        eventName: "ObjectCreated:Put",
        goToCallSessionId: "3215551212",
        goToInitiatorId: "call-abc-123",
        key: "raw/goto/1712900000~3215551212~3215553434~call-abc-123.wav",
        recordedAt: null,
      },
    ]);
  });

  it("parses the current GoTo recording file format", () => {
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
                key: "2026-04-15T19%3A41%3A35Z~59af3e47-06f5-44d4-bf16-517c691d01a6~17726215205~VoiceScript~af40747f-bbe8-4fdf-887d-c5b6c5fb1c72.mp3",
              },
            },
          },
        ],
      }),
    ).toEqual([
      {
        bucket: "servicesyncnow-recordings",
        customerPhoneDigits: "17726215205",
        eventName: "ObjectCreated:Put",
        goToCallSessionId: "59af3e47-06f5-44d4-bf16-517c691d01a6",
        goToInitiatorId: "af40747f-bbe8-4fdf-887d-c5b6c5fb1c72",
        key: "2026-04-15T19:41:35Z~59af3e47-06f5-44d4-bf16-517c691d01a6~17726215205~VoiceScript~af40747f-bbe8-4fdf-887d-c5b6c5fb1c72.mp3",
        recordedAt: new Date("2026-04-15T19:41:35Z"),
      },
    ]);
  });
});
