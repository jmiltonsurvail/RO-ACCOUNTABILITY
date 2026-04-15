import { type Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import {
  fetchGoToCallEventsReport,
  getGoToConnectSettingsWithAccessToken,
  type GoToCallEventsReport,
} from "@/lib/goto-connect";
import { prisma } from "@/lib/prisma";

type GoToCallEventPayload = {
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
  };
  state?: {
    type?: string;
  };
};

type GoToCallEventsReportNotification = {
  data?: {
    content?: {
      conversationSpaceId?: string;
    };
    source?: string;
    type?: string;
  };
};

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractConversationIdsFromEvent(payload: GoToCallEventPayload) {
  const ids = new Set<string>();

  if (payload.metadata?.conversationSpaceId?.trim()) {
    ids.add(payload.metadata.conversationSpaceId.trim());
  }

  for (const related of payload.metadata?.associatedConversations ?? []) {
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

async function findTrackedCallSession(input: {
  conversationIds: string[];
  organizationId: string;
}) {
  if (input.conversationIds.length === 0) {
    return null;
  }

  const orConditions: Prisma.CallSessionWhereInput[] = [];

  for (const conversationId of input.conversationIds) {
    orConditions.push({ conversationSpaceId: conversationId });
    orConditions.push({ goToInitiatorId: conversationId });
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
  const callSession = await findTrackedCallSession({
    conversationIds,
    organizationId: input.organizationId,
  });

  if (!callSession) {
    return {
      matched: false,
      type: "call-event",
    };
  }

  const primaryConversationId = conversationIds[0] ?? null;
  const stateType = input.payload.state?.type?.toUpperCase() ?? null;
  const data: Prisma.CallSessionUpdateInput = {
    ...(primaryConversationId
      ? {
          conversationSpaceId: primaryConversationId,
        }
      : {}),
    ...(input.payload.metadata?.callCreated
      ? {
          callCreatedAt: parseDate(input.payload.metadata.callCreated),
        }
      : {}),
    ...(stateType === "CONNECTED"
      ? {
          wasConnected: true,
        }
      : {}),
  };

  await prisma.callSession.update({
    where: {
      id: callSession.id,
    },
    data,
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
  const settings = await getGoToConnectSettingsWithAccessToken(input.organizationId);

  if (!settings.accessToken) {
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

  if (!rawBody.trim()) {
    return NextResponse.json({ ok: true, received: "empty" });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const reportNotification = payload as GoToCallEventsReportNotification;
  const callEvent = payload as GoToCallEventPayload;

  if (
    reportNotification.data?.source === "call-events-report" &&
    reportNotification.data?.content?.conversationSpaceId
  ) {
    const result = await processCallEventsReportSummary({
      conversationSpaceId: reportNotification.data.content.conversationSpaceId,
      organizationId: settings.organizationId,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  }

  if (callEvent.metadata?.conversationSpaceId || callEvent.metadata?.associatedConversations?.length) {
    const result = await processCallEvent({
      organizationId: settings.organizationId,
      payload: callEvent,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  }

  return NextResponse.json({
    ignored: true,
    ok: true,
  });
}
