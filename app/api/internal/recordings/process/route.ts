import { type NextRequest, NextResponse } from "next/server";
import {
  processCallSessionRecording,
  processReadyCallSessionRecordings,
} from "@/lib/recording-transcription";

function isAuthorizedRequest(request: NextRequest) {
  const expectedSecret = process.env.S3_RECORDING_INGEST_SECRET;
  const providedSecret = request.headers.get("x-recording-ingest-secret");

  if (!expectedSecret) {
    return {
      error: "S3 recording ingest secret is not configured.",
      ok: false as const,
      status: 500,
    };
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return {
      error: "Unauthorized.",
      ok: false as const,
      status: 401,
    };
  }

  return {
    ok: true as const,
  };
}

export async function POST(request: NextRequest) {
  const authorization = isAuthorizedRequest(request);

  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    callSessionId?: string;
    limit?: number;
  };

  if (payload.callSessionId) {
    const result = await processCallSessionRecording(payload.callSessionId);

    return NextResponse.json({
      result,
    });
  }

  const results = await processReadyCallSessionRecordings(payload.limit);

  return NextResponse.json({
    processedCount: results.filter((result) => result.status === "processed").length,
    results,
    skippedCount: results.filter((result) => result.status === "skipped").length,
    totalCount: results.length,
  });
}
