import { ActivityType, Role, TextMessageDirection } from "@prisma/client";
import { type NextRequest } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import {
  getGoToConnectSettingsWithAccessToken,
  getGoToMessageFailureMessage,
  getGoToSmsPayload,
  normalizePhoneForGoToDialString,
} from "@/lib/goto-connect";
import { logGoTo } from "@/lib/goto-debug";
import { prisma } from "@/lib/prisma";

function buildReturnPath(input: {
  message: string;
  returnTo: string;
  roNumber: number;
  status: "error" | "success";
}) {
  const url = new URL(input.returnTo, "http://servicesyncnow.local");
  url.searchParams.set("gotoCallMessage", input.message);
  url.searchParams.set("gotoCallRo", String(input.roNumber));
  url.searchParams.set("gotoCallStatus", input.status);
  return `${url.pathname}${url.search}${url.hash}`;
}

function redirectToReturn(input: {
  message: string;
  returnTo: string;
  roNumber: number;
  status: "error" | "success";
}) {
  return new Response(null, {
    headers: {
      Location: buildReturnPath(input),
    },
    status: 303,
  });
}

export async function POST(request: NextRequest) {
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

  const organizationId = session.user.organizationId;

  if (!organizationId) {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const roNumber = Number(formData.get("ro"));
  const returnTo = String(formData.get("returnTo") || "/manager");
  const messageBody = String(formData.get("message") || "").trim();

  if (!Number.isInteger(roNumber) || roNumber <= 0) {
    return new Response("Missing RO number.", { status: 400 });
  }

  if (!messageBody) {
    return redirectToReturn({
      message: "Enter a text message before sending.",
      returnTo,
      roNumber,
      status: "error",
    });
  }

  if (messageBody.length > 1000) {
    return redirectToReturn({
      message: "Text message must be 1,000 characters or fewer.",
      returnTo,
      roNumber,
      status: "error",
    });
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

  const [settings, advisor] = await Promise.all([
    getGoToConnectSettingsWithAccessToken(organizationId),
    prisma.user.findFirst({
      where: {
        asmNumber: repairOrder.asmNumber,
        organizationId,
        role: Role.ADVISOR,
      },
      select: {
        gotoConnectSmsPhoneNumber: true,
        id: true,
      },
    }),
  ]);
  const contactPhoneNumber = normalizePhoneForGoToDialString(repairOrder.phone);
  const ownerPhoneNumber = advisor?.gotoConnectSmsPhoneNumber?.trim() || null;
  const payload = getGoToSmsPayload({
    body: messageBody,
    contactPhoneNumber,
    ownerPhoneNumber,
  });

  logGoTo("info", "message:start", {
    asmNumber: repairOrder.asmNumber,
    hasAccessToken: Boolean(settings.accessToken),
    hasPayload: Boolean(payload),
    organizationId,
    repairOrderId: repairOrder.id,
    roNumber,
    userRole: session.user.role,
  });

  if (!contactPhoneNumber) {
    return redirectToReturn({
      message: "Customer phone number is missing on this RO.",
      returnTo,
      roNumber,
      status: "error",
    });
  }

  if (!settings.enabled) {
    return redirectToReturn({
      message: "GoTo Connect is not enabled for this organization.",
      returnTo,
      roNumber,
      status: "error",
    });
  }

  if (!settings.accessToken) {
    return redirectToReturn({
      message: "GoTo Connect is enabled but the access token is missing in settings.",
      returnTo,
      roNumber,
      status: "error",
    });
  }

  if (!ownerPhoneNumber) {
    return redirectToReturn({
      message: `Set an SMS phone number for ASM ${repairOrder.asmNumber} in GoTo Connect settings before texting customers.`,
      returnTo,
      roNumber,
      status: "error",
    });
  }

  if (!payload) {
    return redirectToReturn({
      message: "GoTo Connect could not build a text request for this RO.",
      returnTo,
      roNumber,
      status: "error",
    });
  }

  const response = await fetch("https://api.goto.com/messaging/v1/messages", {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const failureMessage = await getGoToMessageFailureMessage(response);
    logGoTo("error", "message:failed", {
      asmNumber: repairOrder.asmNumber,
      failureMessage,
      organizationId,
      repairOrderId: repairOrder.id,
      roNumber,
    });

    return redirectToReturn({
      message: failureMessage,
      returnTo,
      roNumber,
      status: "error",
    });
  }

  let goToMessageId: string | null = null;

  try {
    const payload = (await response.json()) as { id?: string };
    goToMessageId = typeof payload.id === "string" ? payload.id : null;
  } catch {
    goToMessageId = null;
  }

  await prisma.$transaction([
    prisma.contactState.upsert({
      create: {
        advisorUserId: session.user.id,
        contacted: true,
        contactedAt: new Date(),
        customerNotes: `Text sent: ${messageBody}`,
        repairOrderId: repairOrder.id,
      },
      update: {
        advisorUserId: session.user.id,
        contacted: true,
        contactedAt: new Date(),
        customerNotes: `Text sent: ${messageBody}`,
      },
      where: {
        repairOrderId: repairOrder.id,
      },
    }),
    prisma.contactRecord.create({
      data: {
        advisorUserId: session.user.id,
        contactedAt: new Date(),
        customerNotes: `Text sent: ${messageBody}`,
        repairOrderId: repairOrder.id,
      },
    }),
    prisma.textMessage.create({
      data: {
        advisorUserId: session.user.id,
        authorPhoneNumber: ownerPhoneNumber,
        body: messageBody,
        contactPhoneNumber,
        conversationKey: `${ownerPhoneNumber}:${contactPhoneNumber}`,
        direction: TextMessageDirection.OUTBOUND,
        organizationId,
        ownerPhoneNumber,
        providerMessageId: goToMessageId,
        repairOrderId: repairOrder.id,
        rawPayload: payload,
        sentAt: new Date(),
      },
    }),
    prisma.activityLog.create({
      data: {
        message: `Text message sent for RO ${repairOrder.roNumber}.`,
        metadata: {
          customerName: repairOrder.customerName,
          goToMessageId,
          messageBody,
          ownerPhoneNumber,
          phone: repairOrder.phone,
        },
        repairOrderId: repairOrder.id,
        type: ActivityType.CONTACT_UPDATED,
        userId: session.user.id,
      },
    }),
  ]);

  logGoTo("info", "message:sent", {
    asmNumber: repairOrder.asmNumber,
    goToMessageId,
    organizationId,
    repairOrderId: repairOrder.id,
    roNumber,
  });

  return redirectToReturn({
    message: "Text message sent in GoTo Connect.",
    returnTo,
    roNumber,
    status: "success",
  });
}
