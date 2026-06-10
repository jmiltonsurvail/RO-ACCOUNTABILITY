import {
  CallSessionStatus,
  RecordingProcessingStatus,
  TextMessageDirection,
  TranscriptProcessingStatus,
  ActivityType,
  Role,
  type Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { buildCallSessionStorageKeys } from "@/lib/call-storage";
import {
  fetchGoToCallEventsReport,
  getGoToConnectSettingsWithAccessToken,
  type GoToCallEventsReport,
} from "@/lib/goto-connect";
import { getDerivedCallStatus } from "@/lib/call-session-status";
import { logGoTo } from "@/lib/goto-debug";
import { getPlatformIntegrationSettings } from "@/lib/platform-integrations";
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
      recordings?: Array<{
        id?: string;
        startTimestamp?: string;
        transcriptEnabled?: boolean;
      }>;
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

type GoToCallEventState = {
  id?: string;
  recordings?: Array<{
    id?: string;
    startTimestamp?: string;
    transcriptEnabled?: boolean;
  }>;
  sequenceNumber?: number;
  type?: string;
};

type GoToCallEventsReportNotification = {
  content?: {
    aiAnalysis?: {
      summary?: string;
      topics?: string[];
    };
    callAnswered?: string;
    callCreated?: string;
    callEnded?: string;
    caller?: {
      recordingId?: string;
    };
    callerOutcome?: string;
    conversationSpaceId?: string;
    participants?: Array<{
      recordingId?: string;
    }>;
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

type GoToMessagingNotification = {
  content?: {
    authorPhoneNumber?: string;
    body?: string;
    contactPhoneNumber?: string;
    contactPhoneNumbers?: string[];
    deliveryStatusDescription?: string;
    deliveryStatuses?: Array<{
      deliveryStatusDescription?: string;
      messageId?: string;
    }>;
    direction?: string;
    id?: string;
    messageId?: string;
    ownerPhoneNumber?: string;
    timestamp?: string;
  };
  data?: {
    content?: GoToMessagingNotification["content"];
    source?: string;
    type?: string;
  };
  source?: string;
  type?: string;
};

function getEventMetadata(payload: GoToCallEventPayload) {
  return payload.content?.metadata ?? payload.metadata ?? null;
}

function getEventState(payload: GoToCallEventPayload) {
  return (payload.content?.state ?? payload.state ?? null) as GoToCallEventState | null;
}

function extractRecordingIdsFromEvent(payload: GoToCallEventPayload) {
  const state = getEventState(payload);
  const ids = new Set<string>();

  for (const recording of state?.recordings ?? []) {
    if (recording?.id?.trim()) {
      ids.add(recording.id.trim());
    }
  }

  return Array.from(ids);
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

function getReportContent(payload: GoToCallEventsReportNotification) {
  return payload.data?.content ?? payload.content ?? null;
}

function getMessagingSource(payload: GoToMessagingNotification) {
  return payload.data?.source ?? payload.source ?? null;
}

function getMessagingType(payload: GoToMessagingNotification) {
  return payload.data?.type ?? payload.type ?? null;
}

function getMessagingContent(payload: GoToMessagingNotification) {
  return payload.data?.content ?? payload.content ?? null;
}

function getReportRecordingIds(
  content:
    | {
        caller?: {
          recordingId?: string;
        };
        participants?: Array<{
          recordingId?: string;
        }>;
      }
    | null
    | undefined,
) {
  const ids = new Set<string>();

  if (content?.caller?.recordingId?.trim()) {
    ids.add(content.caller.recordingId.trim());
  }

  for (const participant of content?.participants ?? []) {
    if (participant?.recordingId?.trim()) {
      ids.add(participant.recordingId.trim());
    }
  }

  return Array.from(ids);
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

function normalizePhoneDigits(value: string | null | undefined) {
  const digits = value?.replace(/\D+/g, "") ?? "";

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits.length >= 10 ? digits.slice(-10) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function collectPhoneCandidates(value: unknown, candidates = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectPhoneCandidates(entry, candidates));
    return candidates;
  }

  if (!isRecord(value)) {
    return candidates;
  }

  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();

    if (typeof entry === "string") {
      const looksLikePhoneKey =
        normalizedKey.includes("phone") ||
        normalizedKey.includes("number") ||
        normalizedKey.includes("dial") ||
        normalizedKey.includes("ani") ||
        normalizedKey.includes("callerid");
      const digits = normalizePhoneDigits(entry);

      if (looksLikePhoneKey && digits) {
        candidates.add(digits);
      }
    }

    collectPhoneCandidates(entry, candidates);
  }

  return candidates;
}

function collectLineCandidates(
  value: unknown,
  candidates = new Map<string, { extension: string | null; lineId: string | null }>(),
) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectLineCandidates(entry, candidates));
    return candidates;
  }

  if (!isRecord(value)) {
    return candidates;
  }

  const lineId =
    typeof value.lineId === "string" && value.lineId.trim() ? value.lineId.trim() : null;
  const extension =
    (typeof value.extension === "string" && value.extension.trim()
      ? value.extension.trim()
      : null) ||
    (typeof value.extensionNumber === "string" && value.extensionNumber.trim()
      ? value.extensionNumber.trim()
      : null) ||
    (typeof value.number === "string" && /^\d{2,8}$/.test(value.number.trim())
      ? value.number.trim()
      : null);

  if (lineId || extension) {
    candidates.set(`${lineId ?? ""}:${extension ?? ""}`, { extension, lineId });
  }

  for (const entry of Object.values(value)) {
    collectLineCandidates(entry, candidates);
  }

  return candidates;
}

function getInboundReceiverCandidates(report: GoToCallEventsReport) {
  return Array.from(collectLineCandidates(report as unknown).values());
}

async function resolveInboundReceiverUser(input: {
  organizationId: string;
  report: GoToCallEventsReport;
}) {
  const candidates = getInboundReceiverCandidates(input.report);

  for (const candidate of candidates) {
    const user = await prisma.user.findFirst({
      where: {
        organizationId: input.organizationId,
        OR: [
          ...(candidate.lineId ? [{ gotoConnectLineId: candidate.lineId }] : []),
          ...(candidate.extension ? [{ gotoConnectExtension: candidate.extension }] : []),
        ],
      },
      select: {
        id: true,
        gotoConnectExtension: true,
        gotoConnectLineId: true,
      },
    });

    if (user) {
      return {
        sourceExtension: user.gotoConnectExtension,
        sourceLineId: user.gotoConnectLineId,
        userId: user.id,
      };
    }
  }

  return {
    sourceExtension: candidates[0]?.extension ?? null,
    sourceLineId: candidates[0]?.lineId ?? null,
    userId: null,
  };
}

async function findInboundRepairOrderByPhone(input: {
  asmNumber?: number | null;
  organizationId: string;
  phoneCandidates: string[];
}) {
  if (input.phoneCandidates.length === 0) {
    return null;
  }

  const repairOrders = await prisma.repairOrder.findMany({
    where: {
      ...(input.asmNumber !== undefined && input.asmNumber !== null
        ? {
            asmNumber: input.asmNumber,
          }
        : {}),
      isActive: true,
      organizationId: input.organizationId,
      phone: {
        not: null,
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      advisorName: true,
      asmNumber: true,
      contactPhones: {
        select: {
          phoneNumber: true,
        },
      },
      customerName: true,
      id: true,
      phone: true,
      roNumber: true,
    },
  });

  const matches = repairOrders.filter((repairOrder) => {
    const repairOrderPhones = [
      normalizePhoneDigits(repairOrder.phone),
      ...repairOrder.contactPhones.map((phone) => normalizePhoneDigits(phone.phoneNumber)),
    ].filter((phone): phone is string => Boolean(phone));
    return repairOrderPhones.some((phone) => input.phoneCandidates.includes(phone));
  });

  return matches[0] ?? null;
}

function getTextMessageDirection(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? null;

  if (normalized === "IN" || normalized === "INBOUND") {
    return TextMessageDirection.INBOUND;
  }

  if (normalized === "OUT" || normalized === "OUTBOUND") {
    return TextMessageDirection.OUTBOUND;
  }

  return null;
}

function buildTextConversationKey(input: {
  contactPhoneNumber: string | null;
  ownerPhoneNumber: string | null;
}) {
  if (!input.ownerPhoneNumber || !input.contactPhoneNumber) {
    return null;
  }

  return `${input.ownerPhoneNumber}:${input.contactPhoneNumber}`;
}

async function processMessagingNotification(input: {
  organizationId: string;
  payload: GoToMessagingNotification;
}) {
  const content = getMessagingContent(input.payload);
  const notificationType = getMessagingType(input.payload);
  const direction = getTextMessageDirection(content?.direction);
  const ownerPhoneNumber = content?.ownerPhoneNumber?.trim() || null;
  const contactPhoneNumber =
    content?.contactPhoneNumber?.trim() ||
    content?.contactPhoneNumbers?.find((phone) => phone?.trim())?.trim() ||
    null;
  const authorPhoneNumber = content?.authorPhoneNumber?.trim() || null;
  const providerMessageId = content?.id?.trim() || content?.messageId?.trim() || null;
  const sentAt = parseDate(content?.timestamp) ?? new Date();
  const deliveryStatus =
    content?.deliveryStatusDescription?.trim() ||
    content?.deliveryStatuses?.find((status) => status.deliveryStatusDescription?.trim())
      ?.deliveryStatusDescription?.trim() ||
    null;
  const phoneCandidates = Array.from(
    new Set(
      [
        contactPhoneNumber,
        authorPhoneNumber && authorPhoneNumber !== ownerPhoneNumber ? authorPhoneNumber : null,
        ...(content?.contactPhoneNumbers ?? []),
      ]
        .map((phone) => normalizePhoneDigits(phone))
        .filter((phone): phone is string => Boolean(phone)),
    ),
  );

  if (!content) {
    return {
      matched: false,
      reason: "not-message",
      type: "messaging",
    };
  }

  if (!direction && notificationType === "delivery-status" && providerMessageId) {
    const updated = await prisma.textMessage.updateMany({
      where: {
        organizationId: input.organizationId,
        providerMessageId,
      },
      data: {
        deliveryStatus,
        rawPayload: input.payload as Prisma.InputJsonValue,
      },
    });

    return {
      matched: updated.count > 0,
      providerMessageId,
      type: "messaging-delivery-status",
    };
  }

  if (!direction) {
    return {
      matched: false,
      reason: "missing-direction",
      type: "messaging",
    };
  }

  const ownerPhoneDigits = normalizePhoneDigits(ownerPhoneNumber);
  const advisorCandidates = ownerPhoneDigits
    ? await prisma.user.findMany({
        where: {
          active: true,
          gotoConnectSmsPhoneNumber: {
            not: null,
          },
          organizationId: input.organizationId,
          role: Role.ADVISOR,
        },
        select: {
          asmNumber: true,
          gotoConnectSmsPhoneNumber: true,
          id: true,
        },
      })
    : [];
  const ownerAdvisor =
    advisorCandidates.find(
      (advisor) => normalizePhoneDigits(advisor.gotoConnectSmsPhoneNumber) === ownerPhoneDigits,
    ) ?? null;
  const repairOrder = await findInboundRepairOrderByPhone({
    asmNumber: ownerAdvisor?.asmNumber ?? null,
    organizationId: input.organizationId,
    phoneCandidates,
  });

  if (!repairOrder) {
    logGoTo("info", "webhook:message:no-ro-match", {
      direction,
      notificationType,
      organizationId: input.organizationId,
      ownerAdvisorId: ownerAdvisor?.id ?? null,
      phoneCandidates,
      providerMessageId,
    });

    return {
      matched: false,
      reason: "no-ro-phone-match",
      type: "messaging",
    };
  }

  const advisor =
    ownerAdvisor ??
    (await prisma.user.findFirst({
      where: {
        asmNumber: repairOrder.asmNumber,
        organizationId: input.organizationId,
        role: Role.ADVISOR,
      },
      select: {
        asmNumber: true,
        id: true,
      },
    }));
  const conversationKey = buildTextConversationKey({
    contactPhoneNumber,
    ownerPhoneNumber,
  });
  const textMessageData = {
    advisorUserId: direction === TextMessageDirection.OUTBOUND ? advisor?.id ?? null : null,
    authorPhoneNumber,
    body: content.body ?? null,
    contactPhoneNumber,
    conversationKey,
    deliveryStatus,
    direction,
    organizationId: input.organizationId,
    ownerPhoneNumber,
    providerMessageId,
    rawPayload: input.payload as Prisma.InputJsonValue,
    repairOrderId: repairOrder.id,
    sentAt,
  } satisfies Prisma.TextMessageUncheckedCreateInput;

  await prisma.$transaction(async (transaction) => {
    if (providerMessageId) {
      await transaction.textMessage.upsert({
        where: {
          organizationId_providerMessageId: {
            organizationId: input.organizationId,
            providerMessageId,
          },
        },
        create: textMessageData,
        update: {
          authorPhoneNumber,
          body: content.body ?? null,
          contactPhoneNumber,
          conversationKey,
          deliveryStatus,
          direction,
          ownerPhoneNumber,
          rawPayload: input.payload as Prisma.InputJsonValue,
          sentAt,
        },
      });
    } else {
      await transaction.textMessage.create({
        data: textMessageData,
      });
    }

    if (direction === TextMessageDirection.INBOUND) {
      const customerNotes = content.body
        ? `Text received: ${content.body}`
        : "Inbound text message received.";

      await transaction.contactState.upsert({
        where: {
          repairOrderId: repairOrder.id,
        },
        update: {
          advisorUserId: advisor?.id ?? null,
          contacted: true,
          contactedAt: sentAt,
          customerNotes,
        },
        create: {
          advisorUserId: advisor?.id ?? null,
          contacted: true,
          contactedAt: sentAt,
          customerNotes,
          repairOrderId: repairOrder.id,
        },
      });

      await transaction.contactRecord.create({
        data: {
          advisorUserId: advisor?.id ?? null,
          contactedAt: sentAt,
          customerNotes,
          repairOrderId: repairOrder.id,
        },
      });

      await transaction.activityLog.create({
        data: {
          message: `Inbound text received for RO ${repairOrder.roNumber}.`,
          metadata: {
            authorPhoneNumber,
            body: content.body ?? null,
            contactPhoneNumber,
            ownerPhoneNumber,
            providerMessageId,
          },
          repairOrderId: repairOrder.id,
          type: ActivityType.CONTACT_UPDATED,
          userId: advisor?.id ?? null,
        },
      });
    }
  });

  logGoTo("info", "webhook:message:matched", {
    direction,
    notificationType,
    organizationId: input.organizationId,
    providerMessageId,
    roNumber: repairOrder.roNumber,
  });

  return {
    direction,
    matched: true,
    repairOrderId: repairOrder.id,
    type: "messaging",
  };
}

async function ingestInboundCallReport(input: {
  accessTokenSettings: Awaited<ReturnType<typeof getGoToConnectSettingsWithAccessToken>>;
  conversationSpaceId: string;
  organizationId: string;
  report: GoToCallEventsReport;
  reportSummaryContent?: NonNullable<GoToCallEventsReportNotification["content"]>;
}) {
  const direction = input.report.direction?.trim().toUpperCase() ?? null;

  if (direction !== "INBOUND") {
    return {
      matched: false,
      reason: "not-inbound",
      type: "inbound-call-report",
    };
  }

  const phoneCandidates = Array.from(collectPhoneCandidates(input.report as unknown));
  const repairOrder = await findInboundRepairOrderByPhone({
    organizationId: input.organizationId,
    phoneCandidates,
  });

  if (!repairOrder) {
    logGoTo("info", "webhook:inbound-report:no-ro-match", {
      conversationSpaceId: input.conversationSpaceId,
      organizationId: input.organizationId,
      phoneCandidates,
    });
    return {
      matched: false,
      reason: "no-ro-phone-match",
      type: "inbound-call-report",
    };
  }

  const existingCallSession = await prisma.callSession.findFirst({
    where: {
      conversationSpaceId: input.report.conversationSpaceId ?? input.conversationSpaceId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
    },
  });
  const callSessionId = existingCallSession?.id ?? randomUUID();
  const platformSettings = await getPlatformIntegrationSettings();
  const storageKeys = buildCallSessionStorageKeys({
    callSessionId,
    organizationId: input.organizationId,
    settings: platformSettings,
  });
  const reportSummaryContent = input.reportSummaryContent ?? null;
  const callCreatedAt = parseDate(input.report.callCreated);
  const callAnsweredAt =
    parseDate(reportSummaryContent?.callAnswered ?? null) ??
    parseDate(input.report.callAnswered ?? null);
  const callEndedAt = parseDate(input.report.callEnded);
  const durationSeconds = getDurationSeconds(input.report);
  const wasConnected = didCallConnect(input.report) || Boolean(callAnsweredAt);
  const callerOutcome =
    reportSummaryContent?.callerOutcome?.trim() || input.report.callerOutcome?.trim() || null;
  const derivedCallStatus = getDerivedCallStatus({
    callAnsweredAt,
    callEndedAt,
    callState: "ENDED",
    callerOutcome,
    durationSeconds,
    wasConnected,
  });
  const receiver = await resolveInboundReceiverUser({
    organizationId: input.organizationId,
    report: input.report,
  });
  const reportRecordingIds = getReportRecordingIds(reportSummaryContent);
  const goToAiSummary =
    reportSummaryContent?.aiAnalysis?.summary?.trim() ||
    input.report.aiAnalysis?.summary?.trim() ||
    null;
  const contactTimestamp = callEndedAt ?? callAnsweredAt ?? callCreatedAt ?? new Date();
  const shouldMarkContacted = derivedCallStatus === "HUMAN_ANSWERED";

  await prisma.$transaction(async (transaction) => {
    const data = {
      asmNumber: repairOrder.asmNumber,
      callAnsweredAt,
      callCreatedAt,
      callDirection: input.report.direction?.trim().toUpperCase() || "INBOUND",
      callEndedAt,
      callerOutcome,
      callState: "ENDED",
      conversationSpaceId: input.report.conversationSpaceId ?? input.conversationSpaceId,
      customerName: repairOrder.customerName,
      customerPhone: repairOrder.phone,
      durationSeconds,
      goToAiSummary,
      goToPrimaryRecordingId: reportRecordingIds[0] ?? null,
      goToRecordingIds:
        reportRecordingIds.length > 0 ? (reportRecordingIds as Prisma.InputJsonValue) : undefined,
      initiatedByUserId: receiver.userId,
      organizationId: input.organizationId,
      processedRecordingObjectKey: storageKeys.processedRecordingObjectKey,
      rawCallReportJson: input.report as Prisma.InputJsonValue,
      rawRecordingObjectKey: `${storageKeys.rawInboundPrefix}/unmatched/${callSessionId}.wav`,
      recordingStatus: RecordingProcessingStatus.PENDING,
      repairOrderId: repairOrder.id,
      sourceExtension: receiver.sourceExtension,
      sourceLineId: receiver.sourceLineId,
      status: CallSessionStatus.QUEUED,
      storageBucket:
        input.accessTokenSettings.recordingS3Bucket ?? platformSettings.s3Bucket ?? null,
      storagePrefix: storageKeys.storagePrefix,
      transcriptJsonObjectKey: storageKeys.transcriptJsonObjectKey,
      transcriptStatus: TranscriptProcessingStatus.PENDING,
      transcriptTextObjectKey: storageKeys.transcriptTextObjectKey,
      wasConnected,
    } satisfies Prisma.CallSessionUncheckedCreateInput;

    if (existingCallSession) {
      await transaction.callSession.update({
        where: { id: existingCallSession.id },
        data,
      });
    } else {
      await transaction.callSession.create({
        data: {
          ...data,
          id: callSessionId,
        },
      });
    }

    if (shouldMarkContacted) {
      await transaction.contactState.upsert({
        where: {
          repairOrderId: repairOrder.id,
        },
        update: {
          advisorUserId: receiver.userId,
          contacted: true,
          contactedAt: contactTimestamp,
        },
        create: {
          advisorUserId: receiver.userId,
          contacted: true,
          contactedAt: contactTimestamp,
          repairOrderId: repairOrder.id,
        },
      });

      const existingContactRecord = await transaction.contactRecord.findFirst({
        where: {
          callSessionId,
        },
        select: {
          id: true,
        },
      });

      if (!existingContactRecord) {
        await transaction.contactRecord.create({
          data: {
            advisorUserId: receiver.userId,
            callSessionId,
            contactedAt: contactTimestamp,
            repairOrderId: repairOrder.id,
          },
        });
      }
    }
  });

  logGoTo("info", "webhook:inbound-report:matched", {
    callSessionId,
    conversationSpaceId: input.report.conversationSpaceId ?? input.conversationSpaceId,
    derivedCallStatus,
    organizationId: input.organizationId,
    phoneCandidates,
    receiverUserId: receiver.userId,
    roNumber: repairOrder.roNumber,
    shouldMarkContacted,
  });

  return {
    matched: true,
    repairOrderId: repairOrder.id,
    shouldMarkContacted,
    type: "inbound-call-report",
  };
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
  const recordingIds = extractRecordingIdsFromEvent(input.payload);
  logGoTo("info", "webhook:call-event:parsed", {
    conversationIds,
    goToCallSessionIds,
    initiatorIds,
    organizationId: input.organizationId,
    recordingIds,
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
      recordingIds,
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
    ...(state?.type
      ? {
          callState: state.type,
        }
      : {}),
    ...(stateType === "CONNECTED"
      ? {
          wasConnected: true,
        }
      : {}),
    ...(recordingIds.length > 0
      ? {
          goToPrimaryRecordingId: recordingIds[0],
          goToRecordingIds: recordingIds as Prisma.InputJsonValue,
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
    primaryRecordingId: recordingIds[0] ?? null,
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
  reportSummaryContent?: NonNullable<GoToCallEventsReportNotification["content"]>;
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
    const inboundResult = await ingestInboundCallReport({
      accessTokenSettings: settings,
      conversationSpaceId: input.conversationSpaceId,
      organizationId: input.organizationId,
      report,
      reportSummaryContent: input.reportSummaryContent,
    });

    if (inboundResult.matched) {
      return inboundResult;
    }

    logGoTo("warn", "webhook:call-report:unmatched", {
      conversationSpaceId: input.conversationSpaceId,
      inboundReason: inboundResult.reason,
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
  const reportSummaryContent = input.reportSummaryContent ?? null;
  const callAnsweredAt =
    parseDate(reportSummaryContent?.callAnswered ?? null) ??
    parseDate(report.callAnswered ?? null);
  const callEndedAt = parseDate(report.callEnded);
  const contactTimestamp = callEndedAt ?? callCreatedAt ?? new Date();
  const wasConnected = didCallConnect(report) || Boolean(callAnsweredAt);
  const durationSeconds = getDurationSeconds(report);
  const reportRecordingIds = getReportRecordingIds(reportSummaryContent);
  const goToAiSummary =
    reportSummaryContent?.aiAnalysis?.summary?.trim() || report.aiAnalysis?.summary?.trim() || null;
  const callerOutcome =
    reportSummaryContent?.callerOutcome?.trim() || report.callerOutcome?.trim() || null;
  const derivedCallStatus = getDerivedCallStatus({
    callAnsweredAt,
    callEndedAt,
    callState: "ENDED",
    callerOutcome,
    durationSeconds,
    wasConnected,
  });
  const shouldMarkContacted = derivedCallStatus === "HUMAN_ANSWERED";
  const existingContactRecord = await prisma.contactRecord.findFirst({
    where: {
      callSessionId: callSession.id,
    },
    select: {
      id: true,
    },
  });
  const trackedCallSession = await prisma.callSession.findUnique({
    where: {
      id: callSession.id,
    },
    select: {
      initiatedByUserId: true,
      repairOrderId: true,
    },
  });

  await prisma.$transaction(async (transaction) => {
    await transaction.callSession.update({
      where: {
        id: callSession.id,
      },
      data: {
        callAnsweredAt,
        callCreatedAt,
        callDirection: report.direction?.trim().toUpperCase() || "OUTBOUND",
        callEndedAt,
        callState: "ENDED",
        callerOutcome,
        conversationSpaceId: report.conversationSpaceId ?? input.conversationSpaceId,
        durationSeconds,
        goToAiSummary,
        ...(reportRecordingIds.length > 0
          ? {
              goToPrimaryRecordingId: reportRecordingIds[0],
              goToRecordingIds: reportRecordingIds as Prisma.InputJsonValue,
            }
          : {}),
        rawCallReportJson: report as Prisma.InputJsonValue,
        wasConnected,
      },
    });

    if (trackedCallSession && shouldMarkContacted) {
      await transaction.contactState.upsert({
        where: {
          repairOrderId: trackedCallSession.repairOrderId,
        },
        update: {
          advisorUserId: trackedCallSession.initiatedByUserId,
          contacted: true,
          contactedAt: contactTimestamp,
        },
        create: {
          advisorUserId: trackedCallSession.initiatedByUserId,
          contacted: true,
          contactedAt: contactTimestamp,
          repairOrderId: trackedCallSession.repairOrderId,
        },
      });

      if (!existingContactRecord) {
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
    callAnsweredAt: callAnsweredAt?.toISOString() ?? null,
    callSessionId: callSession.id,
    callerOutcome,
    conversationSpaceId: report.conversationSpaceId ?? input.conversationSpaceId,
    durationSeconds,
    derivedCallStatus,
    primaryRecordingId: reportRecordingIds[0] ?? null,
    organizationId: input.organizationId,
    shouldMarkContacted,
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
  const messagingNotification = payload as GoToMessagingNotification;
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
  const reportContent = getReportContent(reportNotification);
  const messagingSource = getMessagingSource(messagingNotification);
  const messagingType = getMessagingType(messagingNotification);

  try {
    if (messagingSource === "messaging") {
      logGoTo("info", "webhook:branch:messaging", {
        organizationId: settings.organizationId,
        type: messagingType,
      });
      const result = await processMessagingNotification({
        organizationId: settings.organizationId,
        payload: messagingNotification,
      });

      return NextResponse.json({
        ok: true,
        result,
      });
    }

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
        reportSummaryContent: reportContent ?? undefined,
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
      messagingSource,
      messagingType,
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
