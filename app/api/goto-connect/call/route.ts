import {
  CallSessionStatus,
  RecordingProcessingStatus,
  Role,
  TranscriptProcessingStatus,
} from "@prisma/client";
import { type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getServerAuthSession } from "@/lib/auth";
import { buildCallSessionStorageKeys } from "@/lib/call-storage";
import {
  getGoToCallFailureMessage,
  getGoToConnectSettings,
  getGoToClickToCallPayload,
  normalizePhoneForGoToDialString,
  resolveGoToLineByExtension,
} from "@/lib/goto-connect";
import { getPlatformIntegrationSettings } from "@/lib/platform-integrations";
import { prisma } from "@/lib/prisma";
import { formatPhoneHref } from "@/lib/utils";

function buildReturnUrl(input: {
  message: string;
  requestUrl: string;
  returnTo: string;
  roNumber: number;
  status: "error" | "success";
}) {
  const url = new URL(input.returnTo, input.requestUrl);
  url.searchParams.set("gotoCallMessage", input.message);
  url.searchParams.set("gotoCallRo", String(input.roNumber));
  url.searchParams.set("gotoCallStatus", input.status);
  return url;
}

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.redirect(new URL("/login", request.url));
  }

  if (
    session.user.role !== Role.ADVISOR &&
    session.user.role !== Role.DISPATCHER &&
    session.user.role !== Role.MANAGER
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const roNumberValue = request.nextUrl.searchParams.get("ro");
  const roNumber = Number(roNumberValue);
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/manager";

  const organizationId = session.user.organizationId;

  if (!organizationId) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!Number.isInteger(roNumber) || roNumber <= 0) {
    return new Response("Missing RO number.", { status: 400 });
  }

  const repairOrder = await prisma.repairOrder.findUnique({
    where: {
      organizationId_roNumber: {
        organizationId,
        roNumber,
      },
    },
    select: {
      asmNumber: true,
      customerName: true,
      id: true,
      phone: true,
      roNumber: true,
    },
  });

  if (!repairOrder) {
    return new Response("Repair order not found.", { status: 404 });
  }

  if (
    session.user.role === Role.ADVISOR &&
    repairOrder.asmNumber !== session.user.asmNumber
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const [settings, advisor, platformSettings] = await Promise.all([
    getGoToConnectSettings(organizationId),
    prisma.user.findFirst({
      where: {
        asmNumber: repairOrder.asmNumber,
        organizationId,
        role: Role.ADVISOR,
      },
      select: {
        gotoConnectExtension: true,
        gotoConnectLineId: true,
      },
    }),
    getPlatformIntegrationSettings(),
  ]);

  const resolvedLine =
    advisor?.gotoConnectLineId ||
    !advisor?.gotoConnectExtension
      ? null
      : await resolveGoToLineByExtension({
          accessToken: settings.accessToken,
          accountKey: settings.accountKey,
          extension: advisor.gotoConnectExtension,
        });

  const dialString = normalizePhoneForGoToDialString(repairOrder.phone);
  const sourceLineId =
    advisor?.gotoConnectLineId ??
    resolvedLine?.lineId ??
    null;
  const clickToCallPayload = getGoToClickToCallPayload({
    dialString,
    lineId: sourceLineId,
    settings,
  });

  const fallbackDialHref = formatPhoneHref(repairOrder.phone);

  if (!dialString && !fallbackDialHref) {
    return Response.redirect(
      buildReturnUrl({
        message: "Customer phone number is missing on this RO.",
        requestUrl: request.url,
        returnTo,
        roNumber,
        status: "error",
      }),
      303,
    );
  }

  if (!settings.enabled) {
    return new Response(null, {
      headers: {
        Location: fallbackDialHref!,
      },
      status: 307,
    });
  }

  if (!settings.accessToken) {
    return Response.redirect(
      buildReturnUrl({
        message: "GoTo Connect is enabled but the access token is missing in settings.",
        requestUrl: request.url,
        returnTo,
        roNumber,
        status: "error",
      }),
      303,
    );
  }

  if (!sourceLineId) {
    return Response.redirect(
      buildReturnUrl({
        message: `ASM ${repairOrder.asmNumber} does not have a resolved GoTo line. Re-save the advisor extension in GoTo settings.`,
        requestUrl: request.url,
        returnTo,
        roNumber,
        status: "error",
      }),
      303,
    );
  }

  if (!clickToCallPayload) {
    return Response.redirect(
      buildReturnUrl({
        message: "GoTo Connect could not build a call request for this RO.",
        requestUrl: request.url,
        returnTo,
        roNumber,
        status: "error",
      }),
      303,
    );
  }

  const response = await fetch("https://api.goto.com/calls/v2/calls", {
    body: JSON.stringify(clickToCallPayload),
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const callSessionId = randomUUID();
  const storageKeys = buildCallSessionStorageKeys({
    callSessionId,
    organizationId,
    settings: platformSettings,
  });

  if (!response.ok) {
    const failureMessage = await getGoToCallFailureMessage(response);

    await prisma.callSession.create({
      data: {
        asmNumber: repairOrder.asmNumber,
        customerName: repairOrder.customerName,
        customerPhone: repairOrder.phone,
        id: callSessionId,
        initiatedByUserId: session.user.id,
        lastError: failureMessage,
        organizationId,
        processedRecordingObjectKey: storageKeys.processedRecordingObjectKey,
        rawRecordingObjectKey: `${storageKeys.rawInboundPrefix}/unmatched/${callSessionId}.wav`,
        recordingStatus: RecordingProcessingStatus.PENDING,
        repairOrderId: repairOrder.id,
        sourceExtension: advisor?.gotoConnectExtension ?? null,
        sourceLineId,
        status: CallSessionStatus.FAILED,
        storagePrefix: storageKeys.storagePrefix,
        transcriptJsonObjectKey: storageKeys.transcriptJsonObjectKey,
        transcriptStatus: TranscriptProcessingStatus.PENDING,
        transcriptTextObjectKey: storageKeys.transcriptTextObjectKey,
      },
    });

    return Response.redirect(
      buildReturnUrl({
        message: failureMessage,
        requestUrl: request.url,
        returnTo,
        roNumber,
        status: "error",
      }),
      303,
    );
  }

  let initiatorId: string | null = null;

  try {
    const payload = (await response.json()) as { initiatorId?: string };
    initiatorId = typeof payload.initiatorId === "string" ? payload.initiatorId : null;
  } catch {
    initiatorId = null;
  }

  await prisma.callSession.create({
    data: {
      asmNumber: repairOrder.asmNumber,
      customerName: repairOrder.customerName,
      customerPhone: repairOrder.phone,
      goToInitiatorId: initiatorId,
      id: callSessionId,
      initiatedByUserId: session.user.id,
      organizationId,
      processedRecordingObjectKey: storageKeys.processedRecordingObjectKey,
      rawRecordingObjectKey: `${storageKeys.rawInboundPrefix}/unmatched/${callSessionId}.wav`,
      recordingStatus: RecordingProcessingStatus.PENDING,
      repairOrderId: repairOrder.id,
      sourceExtension: advisor?.gotoConnectExtension ?? null,
      sourceLineId,
      status: CallSessionStatus.QUEUED,
      storagePrefix: storageKeys.storagePrefix,
      transcriptJsonObjectKey: storageKeys.transcriptJsonObjectKey,
      transcriptStatus: TranscriptProcessingStatus.PENDING,
      transcriptTextObjectKey: storageKeys.transcriptTextObjectKey,
    },
  });

  return Response.redirect(
    buildReturnUrl({
      message: "Call queued in GoTo Connect.",
      requestUrl: request.url,
      returnTo,
      roNumber,
      status: "success",
    }),
    303,
  );
}
