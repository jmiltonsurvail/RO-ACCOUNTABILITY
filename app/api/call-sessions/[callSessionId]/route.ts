import { Role, TranscriptProcessingStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { getServerAuthSession, requireOrganizationId } from "@/lib/auth";
import { getCallSessionTextAsset } from "@/lib/call-session-assets";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ callSessionId: string }> },
) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (
    session.user.role !== Role.ADVISOR &&
    session.user.role !== Role.DISPATCHER &&
    session.user.role !== Role.MANAGER
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const organizationId = requireOrganizationId(session);
  const { callSessionId } = await context.params;
  const callSession = await prisma.callSession.findUnique({
    where: {
      id: callSessionId,
    },
    select: {
      asmNumber: true,
      callSummary: true,
      customerName: true,
      customerPhone: true,
      id: true,
      organizationId: true,
      callCreatedAt: true,
      callEndedAt: true,
      processedRecordingObjectKey: true,
      rawRecordingObjectKey: true,
      storageBucket: true,
      repairOrder: {
        select: {
          roNumber: true,
        },
      },
      durationSeconds: true,
      transcriptStatus: true,
      transcriptTextObjectKey: true,
      requestedAt: true,
      wasConnected: true,
    },
  });

  if (!callSession || callSession.organizationId !== organizationId) {
    return NextResponse.json({ error: "Call record not found." }, { status: 404 });
  }

  if (
    session.user.role === Role.ADVISOR &&
    callSession.asmNumber !== session.user.asmNumber
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let transcriptText: string | null = null;
  let transcriptError: string | null = null;

  if (
    callSession.transcriptStatus === TranscriptProcessingStatus.READY &&
    callSession.transcriptTextObjectKey
  ) {
    try {
      transcriptText = await getCallSessionTextAsset({
        objectKey: callSession.transcriptTextObjectKey,
        organizationId: callSession.organizationId,
        storageBucket: callSession.storageBucket,
      });
    } catch (error) {
      transcriptError =
        error instanceof Error ? error.message : "Unable to load transcript text.";
    }
  }

  return NextResponse.json({
    audioUrl:
      callSession.processedRecordingObjectKey || callSession.rawRecordingObjectKey
        ? `/api/call-sessions/${callSession.id}/audio`
        : null,
    callSession: {
      callSummary: callSession.callSummary,
      customerName: callSession.customerName,
      customerPhone: callSession.customerPhone,
      durationSeconds: callSession.durationSeconds,
      id: callSession.id,
      callCreatedAt: callSession.callCreatedAt?.toISOString() ?? null,
      callEndedAt: callSession.callEndedAt?.toISOString() ?? null,
      repairOrderNumber: callSession.repairOrder.roNumber,
      requestedAt: callSession.requestedAt.toISOString(),
      transcriptError,
      transcriptStatus: callSession.transcriptStatus,
      transcriptText,
      wasConnected: callSession.wasConnected,
    },
  });
}
