import { Role } from "@prisma/client";
import { type NextRequest } from "next/server";
import { getServerAuthSession, requireOrganizationId } from "@/lib/auth";
import { getCallSessionS3Object } from "@/lib/call-session-assets";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ callSessionId: string }> },
) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized.", { status: 401 });
  }

  if (
    session.user.role !== Role.ADVISOR &&
    session.user.role !== Role.DISPATCHER &&
    session.user.role !== Role.MANAGER
  ) {
    return new Response("Forbidden.", { status: 403 });
  }

  const organizationId = requireOrganizationId(session);
  const { callSessionId } = await context.params;
  const callSession = await prisma.callSession.findUnique({
    where: {
      id: callSessionId,
    },
    select: {
      asmNumber: true,
      id: true,
      organizationId: true,
      processedRecordingObjectKey: true,
      rawRecordingObjectKey: true,
    },
  });

  if (!callSession || callSession.organizationId !== organizationId) {
    return new Response("Call record not found.", { status: 404 });
  }

  if (
    session.user.role === Role.ADVISOR &&
    callSession.asmNumber !== session.user.asmNumber
  ) {
    return new Response("Forbidden.", { status: 403 });
  }

  const objectKey =
    callSession.processedRecordingObjectKey || callSession.rawRecordingObjectKey;

  if (!objectKey) {
    return new Response("Recording not available.", { status: 404 });
  }

  try {
    const asset = await getCallSessionS3Object(objectKey);

    return new Response(asset.body, {
      headers: {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=60",
        "Content-Length": String(asset.contentLength),
        "Content-Type": asset.contentType,
      },
      status: 200,
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Unable to load recording.",
      { status: 500 },
    );
  }
}
