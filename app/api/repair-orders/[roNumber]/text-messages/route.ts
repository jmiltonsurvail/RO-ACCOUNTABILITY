import { Role, TextMessageDirection } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAuthorizedRepairOrder(input: {
  organizationId: string;
  roNumber: number;
  user: {
    asmNumber?: number | null;
    role: Role;
  };
}) {
  const repairOrder = await prisma.repairOrder.findUnique({
    where: {
      organizationId_roNumber: {
        organizationId: input.organizationId,
        roNumber: input.roNumber,
      },
    },
    select: {
      asmNumber: true,
      id: true,
    },
  });

  if (!repairOrder) {
    return null;
  }

  if (
    input.user.role === Role.ADVISOR &&
    repairOrder.asmNumber !== input.user.asmNumber
  ) {
    return null;
  }

  return repairOrder;
}

function serializeMessage(message: {
  advisorUser: {
    email: string;
    name: string | null;
  } | null;
  body: string | null;
  deliveryStatus: string | null;
  direction: TextMessageDirection;
  id: string;
  readAt: Date | null;
  sentAt: Date;
}) {
  return {
    advisorLabel: message.advisorUser?.name?.trim() || message.advisorUser?.email || null,
    body: message.body,
    deliveryStatus: message.deliveryStatus,
    direction: message.direction,
    id: message.id,
    readAt: message.readAt?.toISOString() ?? null,
    sentAt: message.sentAt.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ roNumber: string }> },
) {
  const session = await getServerAuthSession();

  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    session.user.role !== Role.ADVISOR &&
    session.user.role !== Role.DISPATCHER &&
    session.user.role !== Role.MANAGER
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await context.params;
  const roNumber = Number(params.roNumber);

  if (!Number.isInteger(roNumber) || roNumber <= 0) {
    return NextResponse.json({ error: "Missing RO number." }, { status: 400 });
  }

  const repairOrder = await getAuthorizedRepairOrder({
    organizationId: session.user.organizationId,
    roNumber,
    user: {
      asmNumber: session.user.asmNumber,
      role: session.user.role,
    },
  });

  if (!repairOrder) {
    return NextResponse.json({ error: "Repair order not found." }, { status: 404 });
  }

  const messages = await prisma.textMessage.findMany({
    where: {
      repairOrderId: repairOrder.id,
    },
    orderBy: {
      sentAt: "asc",
    },
    take: 100,
    include: {
      advisorUser: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({
    messages: messages.map(serializeMessage),
    unreadCount: messages.filter(
      (message) => message.direction === TextMessageDirection.INBOUND && !message.readAt,
    ).length,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roNumber: string }> },
) {
  const session = await getServerAuthSession();

  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    session.user.role !== Role.ADVISOR &&
    session.user.role !== Role.DISPATCHER &&
    session.user.role !== Role.MANAGER
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await context.params;
  const roNumber = Number(params.roNumber);

  if (!Number.isInteger(roNumber) || roNumber <= 0) {
    return NextResponse.json({ error: "Missing RO number." }, { status: 400 });
  }

  const repairOrder = await getAuthorizedRepairOrder({
    organizationId: session.user.organizationId,
    roNumber,
    user: {
      asmNumber: session.user.asmNumber,
      role: session.user.role,
    },
  });

  if (!repairOrder) {
    return NextResponse.json({ error: "Repair order not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as { action?: string } | null;

  if (body?.action !== "mark-read") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  await prisma.textMessage.updateMany({
    where: {
      direction: TextMessageDirection.INBOUND,
      readAt: null,
      repairOrderId: repairOrder.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
