import { type Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import {
  fetchGoToCallEventsReport,
  getGoToConnectSettingsWithAccessToken,
  type GoToCallEventsReport,
} from "@/lib/goto-connect";
import { logGoTo } from "@/lib/goto-debug";
import { prisma } from "@/lib/prisma";

type GoToCallEventPayload = {
  content?: {
    metadata?: {
      accountKey?: string;
      associatedConversations?: Array<
        | string
        | {
            conversationSpaceId?: string;
            id?: string;
          }
      >;
      callCreated?: string;
      conversationSpaceId?: string;
      dialString?: string;
      direction?: string;
      initiatorId?: string;
    };
    state?: {
      id?: string;
      sequenceNumber?: number;
      type?: string;
    };
  };
  metadata?: {
    associatedConversations?: Array<
      | string
      | {
          conversationSpaceId?: string;
          id?: string;
        }
    >;
    callCreated?: string;
    conversationSpaceId?: string;
    initiatorId?: string;
  };
  state?: {
    type?: string;
  };
};

type GoToCallEventsReportNotification = {
  content?: {
    conversationSpaceId?: string;
  };
  source?: string;
  type?: string;
  data?: {
    content?: {
      conversationSpaceId?: string;
    };
    source?: string;
    type?: string;
  };
};

function getEventMetadata(payload: GoToCallEventPayload) {
  return payload.content?.metadata ?? payload.metadata ?? null;
}

function getEventState(payload: GoToCallEventPayload) {
  return payload.content?.state ?? payload.state ?? null;
}

function getReportConversationSpaceId(payload: GoToCallEventsReportNotification) {
  return payload.data?.content?.conversationSpaceId ?? payload.content?.conversationSpaceId ?? null;
}

function getReportSource(payload: GoToCallEventsReportNotification) {
  return payload.data?.source ?? payload.source ?? null;
}

function getReportType(payload: GoToCallEventsReportNotification) {
  return payload.data?.type ?? payload.type ?? null;
}

function getPayloadPreview(rawBody: string, maxLength = 1200) {
  return rawBody.length > maxLength ? `${rawBody.slice(0, maxLength)}…` : rawBody;
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractConversationIdsFromEvent(payload: GoToCallEventPayload) {
  const ids = new Set<string>();
  const metadata = getEventMetadata(payload);

  if (metadata?.conversationSpaceId?.trim()) {
    ids.add(metadata.conversationSpaceId.trim());
  }

  for (const related of metadata?.associatedConversations ?? []) {
    if (typeof related === "string" && related.trim()) {
      ids.add(related.trim());
      continue;
    }

    if (!related || typeof related !== "object") {
      continue;
    }

    const relatedId =
      ("conversationSpaceId" in related &&
      typeof related.conversationSpaceId === "string" &&
      related.conversationSpaceId.trim()
        ? related.conversationSpaceId.trim()
        : null) ||
      ("id" in related && typeof related.id === "string" && related.id.trim()
        ? related.id.trim()
        : null);

    if (relatedId) {
      ids.add(relatedId);
    }
  }

  return Array.from(ids);
}

function extractGoToCallSessionIdsFromEvent(payload: GoToCallEventPayload) {
  const ids = new Set<string>();
  const metadata = getEventMetadata(payload);

  for (const related of metadata?.associatedConversations ?? []) {
    if (!related || typeof related !== "object") {
      continue;
    }

    if ("id" in related && typeof related.id === "string" && related.id.trim()) {
      ids.add(related.id.trim());
    }
  }

  return Array.from(ids);
}

function extractInitiatorIdsFromEvent(payload: GoToCallEventPayload) {
  const ids = new Set<string>();
  const metadata = getEventMetadata(payload);

  if (metadata?.initiatorId?.trim()) {
    ids.add(metadata.initiatorId.trim());
  }

  return Array.from(ids);
}

async function findTrackedCallSession(input: {
  conversationIds: string[];
  initiatorIds?: string[];
  organizationId: string;
}) {
  if (input.conversationIds.length === 0 && (input.initiatorIds?.length ?? 0) === 0) {
    return null;
  }

  const orConditions: Prisma.CallSessionWhereInput[] = [];

  for (const conversationId of input.conversationIds) {
    orConditions.push({ conversationSpaceId: conversationId });
    orConditions.push({ goToCallSessionId: conversationId });
    orConditions.push({ goToInitiatorId: conversationId });
  }

  for (const initiatorId of input.initiatorIds ?? []) {
    orConditions.push({ goToInitiatorId: initiatorId });
  }

  return prisma.callSession.findFirst({
    orderBy: {
      requestedAt: "desc",
    },
    select: {
      id: true,
    },
    where: {
      organizationId: input.organizationId,
      OR: orConditions,
    },
  });
}

function getDurationSeconds(report: GoToCallEventsReport) {
  const callCreatedAt = parseDate(report.callCreated);
  const callEndedAt = parseDate(report.callEnded);

  if (!callCreatedAt || !callEndedAt) {
    return null;
  }

  const seconds = Math.max(
    0,
    Math.round((callEndedAt.getTime() - callCreatedAt.getTime()) / 1000),
  );

  return Number.isFinite(seconds) ? seconds : null;
}

function didCallConnect(report: GoToCallEventsReport) {
  return Boolean(
    report.callStates?.some((state) => state.type?.toUpperCase() === "CONNECTED"),
  );
}

async function processCallEvent(input: {
  organizationId: string;
  payload: GoToCallEventPayload;
}) {
  const conversationIds = extractConversationIdsFromEvent(input.payload);
  const goToCallSessionIds = extractGoToCallSessionIdsFromEvent(input.payload);
  const initiatorIds = extractInitiatorIdsFromEvent(input.payload);
  const metadata = getEventMetadata(input.payload);
  const state = getEventState(input.payload);
  logGoTo("info", "webhook:call-event:parsed", {
    conversationIds,
    goToCallSessionIds,
    initiatorIds,
    organizationId: input.organizationId,
    stateType: state?.type ?? null,
  });
  const callSession = await findTrackedCallSession({
    conversationIds: [...conversationIds, ...goToCallSessionIds],
    initiatorIds,
    organizationId: input.organizationId,
  });

  if (!callSession) {
    logGoTo("warn", "webhook:call-event:unmatched", {
      conversationIds,
      goToCallSessionIds,
      initiatorIds,
      organizationId: input.organizationId,
      stateType: state?.type ?? null,
    });
    return {
      matched: false,
      type: "call-event",
    };
  }

  const primaryConversationId = conversationIds[0] ?? null;
  const stateType = state?.type?.toUpperCase() ?? null;
  const data: Prisma.CallSessionUpdateInput = {
    ...(primaryConversationId
      ? {
          conversationSpaceId: primaryConversationId,
        }
      : {}),
    ...(metadata?.callCreated
      ? {
          callCreatedAt: parseDate(metadata.callCreated),
        }
      : {}),
    ...(stateType === "CONNECTED"
      ? {
          wasConnected: true,
        }
      : {}),
    ...(goToCallSessionIds[0]
      ? {
          goToCallSessionId: goToCallSessionIds[0],
        }
      : {}),
  };

  await prisma.callSession.update({
    where: {
      id: callSession.id,
    },
    data,
  });

  logGoTo("info", "webhook:call-event:matched", {
    callSessionId: callSession.id,
    conversationSpaceId: primaryConversationId,
    goToCallSessionId: goToCallSessionIds[0] ?? null,
    goToInitiatorId: initiatorIds[0] ?? null,
    organizationId: input.organizationId,
    stateType,
  });

  return {
    callSessionId: callSession.id,
    matched: true,
    stateType,
    type: "call-event",
  };
}

async function processCallEventsReportSummary(input: {
  organizationId: string;
  conversationSpaceId: string;
}) {
  logGoTo("info", "webhook:call-report:start", {
    conversationSpaceId: input.conversationSpaceId,
    organizationId: input.organizationId,
  });
  const settings = await getGoToConnectSettingsWithAccessToken(input.organizationId);

  if (!settings.accessToken) {
    logGoTo("warn", "webhook:call-report:missing-access-token", {
      conversationSpaceId: input.conversationSpaceId,
      organizationId: input.organizationId,
    });
    return {
      matched: false,
      reason: "missing-access-token",
      type: "call-report",
    };
  }

  const report = await fetchGoToCallEventsReport({
    accessToken: settings.accessToken,
    conversationSpaceId: input.conversationSpaceId,
  });

  const callSession = await findTrackedCallSession({
    conversationIds: [input.conversationSpaceId],
    organizationId: input.organizationId,
  });

  if (!callSession) {
    logGoTo("warn", "webhook:call-report:unmatched", {
      conversationSpaceId: input.conversationSpaceId,
      organizationId: input.organizationId,
      reportConversationSpaceId: report.conversationSpaceId ?? null,
    });
    return {
      matched: false,
      reason: "no-call-session",
      type: "call-report",
    };
  }

  const callCreatedAt = parseDate(report.callCreated);
  const callEndedAt = parseDate(report.callEnded);
  const contactTimestamp = callEndedAt ?? callCreatedAt ?? new Date();
  const wasConnected = didCallConnect(report);
  const existingContactRecord = await prisma.contactRecord.findFirst({
    where: {
      callSessionId: callSession.id,
    },
    select: {
      id: true,
    },
  });

  await prisma.$transaction(async (transaction) => {
    await transaction.callSession.update({
      where: {
        id: callSession.id,
      },
      data: {
        callCreatedAt,
        callEndedAt,
        conversationSpaceId: report.conversationSpaceId ?? input.conversationSpaceId,
        durationSeconds: getDurationSeconds(report),
        rawCallReportJson: report as Prisma.InputJsonValue,
        wasConnected,
      },
    });

    if (!existingContactRecord) {
      const trackedCallSession = await transaction.callSession.findUnique({
        where: {
          id: callSession.id,
        },
        select: {
          initiatedByUserId: true,
          repairOrderId: true,
        },
      });

      if (trackedCallSession) {
        await transaction.contactRecord.create({
          data: {
            advisorUserId: trackedCallSession.initiatedByUserId,
            callSessionId: callSession.id,
            contactedAt: contactTimestamp,
            repairOrderId: trackedCallSession.repairOrderId,
          },
        });
      }
    }
  });

  logGoTo("info", "webhook:call-report:matched", {
    callCreatedAt: callCreatedAt?.toISOString() ?? null,
    callEndedAt: callEndedAt?.toISOString() ?? null,
    callSessionId: callSession.id,
    conversationSpaceId: report.conversationSpaceId ?? input.conversationSpaceId,
    durationSeconds: getDurationSeconds(report),
    organizationId: input.organizationId,
    wasConnected,
  });

  return {
    callSessionId: callSession.id,
    matched: true,
    type: "call-report",
  };
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? null;

  if (!token) {
    return NextResponse.json({ error: "Missing webhook token." }, { status: 401 });
  }

  const settings = await prisma.goToConnectSettings.findFirst({
    select: {
      organizationId: true,
    },
    where: {
      notificationWebhookToken: token,
    },
  });

  if (!settings) {
    return NextResponse.json({ error: "Invalid webhook token." }, { status: 401 });
  }

  const rawBody = await request.text();
  logGoTo("info", "webhook:received", {
    bodyLength: rawBody.length,
    organizationId: settings.organizationId,
    payloadPreview: getPayloadPreview(rawBody),
    tokenSuffix: token.slice(-8),
  });

  if (!rawBody.trim()) {
    logGoTo("info", "webhook:empty-body", {
      organizationId: settings.organizationId,
      tokenSuffix: token.slice(-8),
    });
    return NextResponse.json({ ok: true, received: "empty" });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    logGoTo("error", "webhook:invalid-json", {
      organizationId: settings.organizationId,
      tokenSuffix: token.slice(-8),
    });
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const reportNotification = payload as GoToCallEventsReportNotification;
  const callEvent = payload as GoToCallEventPayload;
  const topLevelKeys =
    payload && typeof payload === "object" ? Object.keys(payload as Record<string, unknown>) : [];
  const dataKeys =
    reportNotification.data && typeof reportNotification.data === "object"
      ? Object.keys(reportNotification.data as Record<string, unknown>)
      : [];
  const normalizedContent =
    reportNotification.data?.content && typeof reportNotification.data.content === "object"
      ? reportNotification.data.content
      : reportNotification.content && typeof reportNotification.content === "object"
        ? reportNotification.content
        : null;
  const contentKeys =
    normalizedContent && typeof normalizedContent === "object"
      ? Object.keys(normalizedContent as Record<string, unknown>)
      : [];
  const normalizedMetadata = getEventMetadata(callEvent);
  const metadataKeys =
    normalizedMetadata && typeof normalizedMetadata === "object"
      ? Object.keys(normalizedMetadata as Record<string, unknown>)
      : [];
  const normalizedState = getEventState(callEvent);
  const contentConversationSpaceId = getReportConversationSpaceId(reportNotification);
  const reportSource = getReportSource(reportNotification);
  const reportType = getReportType(reportNotification);

  try {
    if (
      reportSource === "call-events-report" &&
      contentConversationSpaceId
    ) {
      logGoTo("info", "webhook:branch:call-report", {
        conversationSpaceId: contentConversationSpaceId,
        organizationId: settings.organizationId,
        type: reportType,
      });
      const result = await processCallEventsReportSummary({
        conversationSpaceId: contentConversationSpaceId,
        organizationId: settings.organizationId,
      });

      return NextResponse.json({
        ok: true,
        result,
      });
    }

    if (
      reportSource === "call-events" ||
      normalizedMetadata?.conversationSpaceId ||
      normalizedMetadata?.associatedConversations?.length ||
      normalizedMetadata?.initiatorId
    ) {
      logGoTo("info", "webhook:branch:call-event", {
        associatedConversationCount: normalizedMetadata?.associatedConversations?.length ?? 0,
        conversationSpaceId: normalizedMetadata?.conversationSpaceId ?? null,
        initiatorId: normalizedMetadata?.initiatorId ?? null,
        organizationId: settings.organizationId,
        stateType: normalizedState?.type ?? null,
      });
      const result = await processCallEvent({
        organizationId: settings.organizationId,
        payload: callEvent,
      });

      return NextResponse.json({
        ok: true,
        result,
      });
    }

    logGoTo("warn", "webhook:ignored", {
      associatedConversationCount: normalizedMetadata?.associatedConversations?.length ?? 0,
      contentConversationSpaceId,
      contentKeys,
      dataKeys,
      dataSource: reportSource,
      dataType: reportType,
      hasData: Boolean(reportNotification.data || reportNotification.content),
      hasMetadata: Boolean(normalizedMetadata),
      metadataConversationSpaceId: normalizedMetadata?.conversationSpaceId ?? null,
      metadataKeys,
      organizationId: settings.organizationId,
      topLevelKeys,
    });
    return NextResponse.json({
      ignored: true,
      ok: true,
    });
  } catch (error) {
    logGoTo("error", "webhook:processing-failed", {
      conversationSpaceId: contentConversationSpaceId ?? normalizedMetadata?.conversationSpaceId ?? null,
      message: error instanceof Error ? error.message : "Unknown webhook processing error",
      organizationId: settings.organizationId,
      reportSource,
      reportType,
    });

    return NextResponse.json(
      {
        error: "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}
