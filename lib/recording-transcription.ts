import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import {
  ActivityType,
  RecordingProcessingStatus,
  TranscriptProcessingStatus,
} from "@prisma/client";
import { Readable } from "node:stream";
import { getPlatformIntegrationSettings } from "@/lib/platform-integrations";
import { prisma } from "@/lib/prisma";

const DEFAULT_OPENAI_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_OPENAI_SUMMARY_MODEL = "gpt-4.1-mini";
const MAX_TRANSCRIPTION_BYTES = 25 * 1024 * 1024;
const STALE_TRANSCRIPT_PROCESSING_MINUTES = 15;

type ProcessCallSessionRecordingResult =
  | {
      callSessionId: string;
      message: string;
      status: "failed";
    }
  | {
      callSessionId: string;
      message: string;
      status: "processed" | "skipped";
    };

function getS3Client(region: string) {
  return new S3Client({ region });
}

async function streamToBuffer(body: GetObjectCommandOutput["Body"]) {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const byteArray = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(byteArray);
  }

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];

    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (typeof body === "string") {
    return Buffer.from(body);
  }

  return Buffer.alloc(0);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Recording processing failed.";
}

function getOpenAiErrorMessage(rawBody: string) {
  try {
    const parsed = JSON.parse(rawBody) as {
      error?: {
        message?: string;
      };
    };

    const message = parsed.error?.message?.trim();
    return message && message.length > 0 ? message : rawBody;
  } catch {
    return rawBody;
  }
}

async function transcribeAudioWithOpenAi(input: {
  apiKey: string;
  audioBuffer: Buffer;
  contentType: string;
  fileName: string;
  model: string;
}) {
  if (input.audioBuffer.byteLength === 0) {
    throw new Error("Recording file is empty.");
  }

  if (input.audioBuffer.byteLength > MAX_TRANSCRIPTION_BYTES) {
    throw new Error(
      "Recording exceeds the current 25 MB transcription limit. Add chunking before retrying.",
    );
  }

  const formData = new FormData();
  formData.set("model", input.model);
  formData.set(
    "file",
    new Blob([new Uint8Array(input.audioBuffer)], { type: input.contentType }),
    input.fileName,
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    body: formData,
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
    method: "POST",
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(getOpenAiErrorMessage(rawBody));
  }

  let parsed: Record<string, unknown> | null = null;

  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  const text =
    typeof parsed?.text === "string" && parsed.text.trim().length > 0
      ? parsed.text.trim()
      : rawBody.trim();

  if (!text) {
    throw new Error("OpenAI returned an empty transcript.");
  }

  return {
    payload: parsed ?? { text },
    text,
  };
}

async function summarizeTranscriptWithOpenAi(input: {
  apiKey: string;
  model: string;
  transcriptText: string;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    body: JSON.stringify({
      messages: [
        {
          content:
            "You summarize recorded customer service phone calls for service repair orders.",
          role: "system",
        },
        {
          content: [
            "Summarize this customer call in 2 to 4 concise sentences.",
            "Focus only on what was communicated to the customer and what they communicated back.",
            "Do not mention that this is an AI summary.",
            "Do not invent missing details.",
            "",
            input.transcriptText,
          ].join("\n"),
          role: "user",
        },
      ],
      model: input.model,
      temperature: 0.2,
    }),
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(getOpenAiErrorMessage(rawBody));
  }

  const parsed = JSON.parse(rawBody) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const summary = parsed.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    throw new Error("OpenAI returned an empty call summary.");
  }

  return summary;
}

async function markTranscriptFailure(input: {
  callSessionId: string;
  message: string;
  repairOrderId: string;
}) {
  await prisma.$transaction([
    prisma.callSession.update({
      where: {
        id: input.callSessionId,
      },
      data: {
        lastError: input.message,
        transcriptStatus: TranscriptProcessingStatus.FAILED,
      },
    }),
    prisma.activityLog.create({
      data: {
        message: input.message,
        metadata: {
          callSessionId: input.callSessionId,
        },
        repairOrderId: input.repairOrderId,
        type: ActivityType.CALL_TRANSCRIPT_FAILED,
      },
    }),
  ]);
}

export async function processCallSessionRecording(
  callSessionId: string,
): Promise<ProcessCallSessionRecordingResult> {
  const staleProcessingCutoff = new Date(
    Date.now() - STALE_TRANSCRIPT_PROCESSING_MINUTES * 60 * 1000,
  );
  const callSession = await prisma.callSession.findUnique({
    where: {
      id: callSessionId,
    },
    select: {
      asmNumber: true,
      customerName: true,
      customerPhone: true,
      goToInitiatorId: true,
      id: true,
      organizationId: true,
      processedRecordingObjectKey: true,
      rawRecordingObjectKey: true,
      recordingStatus: true,
      repairOrder: {
        select: {
          roNumber: true,
        },
      },
      repairOrderId: true,
      requestedAt: true,
      transcriptJsonObjectKey: true,
      transcriptStatus: true,
      transcriptTextObjectKey: true,
      updatedAt: true,
    },
  });

  if (!callSession) {
    return {
      callSessionId,
      message: "Call session not found.",
      status: "failed",
    };
  }

  if (callSession.recordingStatus !== RecordingProcessingStatus.READY) {
    return {
      callSessionId,
      message: "Recording is not ready for transcription.",
      status: "skipped",
    };
  }

  if (!callSession.rawRecordingObjectKey) {
    return {
      callSessionId,
      message: "Recording object key is missing.",
      status: "failed",
    };
  }

  if (callSession.transcriptStatus === TranscriptProcessingStatus.READY) {
    return {
      callSessionId,
      message: "Transcript is already available.",
      status: "skipped",
    };
  }

  const claimableStatuses = [TranscriptProcessingStatus.PENDING, TranscriptProcessingStatus.FAILED];
  const claimed = await prisma.callSession.updateMany({
    where: {
      id: callSessionId,
      recordingStatus: RecordingProcessingStatus.READY,
      OR: [
        {
          transcriptStatus: {
            in: claimableStatuses,
          },
        },
        {
          transcriptStatus: TranscriptProcessingStatus.PROCESSING,
          updatedAt: {
            lt: staleProcessingCutoff,
          },
        },
      ],
    },
    data: {
      lastError: null,
      transcriptStatus: TranscriptProcessingStatus.PROCESSING,
    },
  });

  if (claimed.count === 0) {
    return {
      callSessionId,
      message: "Transcript is already processing or complete.",
      status: "skipped",
    };
  }

  const settings = await getPlatformIntegrationSettings();

  if (!settings.awsRegion || !settings.s3Bucket) {
    const message = "AWS region and S3 bucket are required before processing recordings.";
    await markTranscriptFailure({
      callSessionId,
      message,
      repairOrderId: callSession.repairOrderId,
    });
    return {
      callSessionId,
      message,
      status: "failed",
    };
  }

  if (!settings.openAiApiKey) {
    const message = "OpenAI API key is required before processing recordings.";
    await markTranscriptFailure({
      callSessionId,
      message,
      repairOrderId: callSession.repairOrderId,
    });
    return {
      callSessionId,
      message,
      status: "failed",
    };
  }

  const s3 = getS3Client(settings.awsRegion);

  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: settings.s3Bucket,
        Key: callSession.rawRecordingObjectKey,
      }),
    );

    const audioBuffer = await streamToBuffer(object.Body);
    const contentType = object.ContentType?.trim() || "audio/wav";
    const sourceFileName =
      callSession.rawRecordingObjectKey.split("/").at(-1)?.trim() || `${callSession.id}.wav`;

    if (callSession.processedRecordingObjectKey) {
      await s3.send(
        new PutObjectCommand({
          Body: audioBuffer,
          Bucket: settings.s3Bucket,
          ContentType: contentType,
          Key: callSession.processedRecordingObjectKey,
        }),
      );
    }

    const transcription = await transcribeAudioWithOpenAi({
      apiKey: settings.openAiApiKey,
      audioBuffer,
      contentType,
      fileName: sourceFileName,
      model: settings.openAiTranscriptionModel || DEFAULT_OPENAI_TRANSCRIPTION_MODEL,
    });
    let callSummary: string | null = null;

    try {
      callSummary = await summarizeTranscriptWithOpenAi({
        apiKey: settings.openAiApiKey,
        model: DEFAULT_OPENAI_SUMMARY_MODEL,
        transcriptText: transcription.text,
      });
    } catch {
      callSummary = null;
    }

    const transcriptArtifact = {
      asmNumber: callSession.asmNumber,
      callSessionId: callSession.id,
      callSummary,
      customerName: callSession.customerName,
      customerPhone: callSession.customerPhone,
      goToInitiatorId: callSession.goToInitiatorId,
      model: settings.openAiTranscriptionModel || DEFAULT_OPENAI_TRANSCRIPTION_MODEL,
      openAiResponse: transcription.payload,
      rawRecordingObjectKey: callSession.rawRecordingObjectKey,
      repairOrderId: callSession.repairOrderId,
      repairOrderNumber: callSession.repairOrder.roNumber,
      requestedAt: callSession.requestedAt.toISOString(),
      sourceFileName,
      transcriptText: transcription.text,
      transcribedAt: new Date().toISOString(),
    };

    if (callSession.transcriptJsonObjectKey) {
      await s3.send(
        new PutObjectCommand({
          Body: JSON.stringify(transcriptArtifact, null, 2),
          Bucket: settings.s3Bucket,
          ContentType: "application/json",
          Key: callSession.transcriptJsonObjectKey,
        }),
      );
    }

    if (callSession.transcriptTextObjectKey) {
      await s3.send(
        new PutObjectCommand({
          Body: transcription.text,
          Bucket: settings.s3Bucket,
          ContentType: "text/plain; charset=utf-8",
          Key: callSession.transcriptTextObjectKey,
        }),
      );
    }

    await prisma.$transaction([
      prisma.callSession.update({
        where: {
          id: callSession.id,
        },
        data: {
          callSummary,
          lastError: null,
          transcriptStatus: TranscriptProcessingStatus.READY,
        },
      }),
      prisma.activityLog.create({
        data: {
          message: `Call transcript ready for RO ${callSession.repairOrder.roNumber}.`,
          metadata: {
            callSessionId: callSession.id,
            goToInitiatorId: callSession.goToInitiatorId,
            processedRecordingObjectKey: callSession.processedRecordingObjectKey,
            transcriptJsonObjectKey: callSession.transcriptJsonObjectKey,
            transcriptTextObjectKey: callSession.transcriptTextObjectKey,
          },
          repairOrderId: callSession.repairOrderId,
          type: ActivityType.CALL_TRANSCRIPT_READY,
        },
      }),
    ]);

    return {
      callSessionId,
      message: "Transcript created successfully.",
      status: "processed",
    };
  } catch (error) {
    const message = getErrorMessage(error);
    await markTranscriptFailure({
      callSessionId,
      message,
      repairOrderId: callSession.repairOrderId,
    });

    return {
      callSessionId,
      message,
      status: "failed",
    };
  }
}

export async function processReadyCallSessionRecordings(limit = 10) {
  const staleProcessingCutoff = new Date(
    Date.now() - STALE_TRANSCRIPT_PROCESSING_MINUTES * 60 * 1000,
  );
  const callSessions = await prisma.callSession.findMany({
    orderBy: {
      requestedAt: "asc",
    },
    select: {
      id: true,
    },
    take: Math.max(1, Math.min(limit, 100)),
    where: {
      recordingStatus: RecordingProcessingStatus.READY,
      OR: [
        {
          transcriptStatus: {
            in: [TranscriptProcessingStatus.PENDING, TranscriptProcessingStatus.FAILED],
          },
        },
        {
          transcriptStatus: TranscriptProcessingStatus.PROCESSING,
          updatedAt: {
            lt: staleProcessingCutoff,
          },
        },
      ],
    },
  });

  const results: ProcessCallSessionRecordingResult[] = [];

  for (const callSession of callSessions) {
    results.push(await processCallSessionRecording(callSession.id));
  }

  return results;
}
