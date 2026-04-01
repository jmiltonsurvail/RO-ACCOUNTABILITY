import { ActivityType, Prisma, Role } from "@prisma/client";
import { differenceInHours } from "date-fns";
import { prisma } from "@/lib/prisma";

const roCardInclude = {
  blockerState: true,
  contactState: true,
  activities: {
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.RepairOrderInclude;

const activeRepairOrderBoardInclude = {
  blockerState: true,
  contactState: true,
} satisfies Prisma.RepairOrderInclude;

export async function getActiveRepairOrders() {
  const repairOrders = await prisma.repairOrder.findMany({
    where: { isActive: true },
    orderBy: [{ asmNumber: "asc" }, { roNumber: "asc" }],
    include: activeRepairOrderBoardInclude,
  });

  return repairOrders;
}

export async function getAdvisorBoard(asmNumber: number) {
  return prisma.repairOrder.findMany({
    where: {
      asmNumber,
      isActive: true,
      blockerState: {
        isBlocked: true,
      },
    },
    orderBy: [
      {
        blockerState: {
          blockerStartedAt: "desc",
        },
      },
      { roNumber: "asc" },
    ],
    include: roCardInclude,
  });
}

export async function getManagerDashboardData() {
  const blockedRepairOrders = await prisma.repairOrder.findMany({
    where: {
      isActive: true,
      blockerState: {
        isBlocked: true,
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    include: roCardInclude,
  });

  const importBatches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      uploadedBy: {
        select: {
          email: true,
          name: true,
        },
      },
      rowErrors: {
        orderBy: { rowNumber: "asc" },
        take: 10,
      },
    },
  });

  const kpis = blockedRepairOrders.reduce(
    (accumulator, repairOrder) => {
      const blocker = repairOrder.blockerState;
      if (!blocker) {
        return accumulator;
      }

      accumulator.totalBlocked += 1;
      accumulator.totalBlockedHours += differenceInHours(
        new Date(),
        blocker.blockerStartedAt,
      );

      const promisedDate = blocker.techPromisedDate ?? repairOrder.promisedAtNormalized;
      if (promisedDate && promisedDate < new Date()) {
        accumulator.overdue += 1;
      }

      if (!repairOrder.contactState?.contacted) {
        accumulator.notContacted += 1;
      }

      return accumulator;
    },
    {
      notContacted: 0,
      overdue: 0,
      totalBlocked: 0,
      totalBlockedHours: 0,
    },
  );

  const advisorSummaryMap = new Map<
    number,
    { asmNumber: number; blockedCount: number; notContactedCount: number }
  >();

  blockedRepairOrders.forEach((repairOrder) => {
    const summary = advisorSummaryMap.get(repairOrder.asmNumber) ?? {
      asmNumber: repairOrder.asmNumber,
      blockedCount: 0,
      notContactedCount: 0,
    };

    summary.blockedCount += 1;

    if (!repairOrder.contactState?.contacted) {
      summary.notContactedCount += 1;
    }

    advisorSummaryMap.set(repairOrder.asmNumber, summary);
  });

  const board = blockedRepairOrders
    .map((repairOrder) => {
      const blocker = repairOrder.blockerState;
      const hoursBlocked = blocker
        ? differenceInHours(new Date(), blocker.blockerStartedAt)
        : 0;
      const promisedDate = blocker?.techPromisedDate ?? repairOrder.promisedAtNormalized;
      const isOverdue = Boolean(promisedDate && promisedDate < new Date());
      const contacted = repairOrder.contactState?.contacted ?? false;

      return {
        ...repairOrder,
        contacted,
        hoursBlocked,
        isOverdue,
      };
    })
    .sort((left, right) => {
      if (left.contacted !== right.contacted) {
        return left.contacted ? 1 : -1;
      }

      if (left.isOverdue !== right.isOverdue) {
        return left.isOverdue ? -1 : 1;
      }

      return right.hoursBlocked - left.hoursBlocked;
    });

  return {
    advisorSummary: Array.from(advisorSummaryMap.values()).sort(
      (left, right) => left.asmNumber - right.asmNumber,
    ),
    board,
    importBatches,
    kpis: {
      averageBlockedHours:
        kpis.totalBlocked === 0 ? 0 : Math.round(kpis.totalBlockedHours / kpis.totalBlocked),
      notContacted: kpis.notContacted,
      overdue: kpis.overdue,
      totalBlocked: kpis.totalBlocked,
    },
  };
}

export async function getRecentImportBatch(batchId?: string) {
  if (batchId) {
    return prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        rowErrors: {
          orderBy: { rowNumber: "asc" },
        },
        uploadedBy: true,
      },
    });
  }

  return prisma.importBatch.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      rowErrors: {
        orderBy: { rowNumber: "asc" },
      },
      uploadedBy: true,
    },
  });
}

export async function logActivity(input: {
  importBatchId?: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  repairOrderId?: string;
  type: ActivityType;
  userId?: string;
}) {
  await prisma.activityLog.create({
    data: input,
  });
}

export function roleHome(role: Role) {
  if (role === Role.MANAGER) {
    return "/manager";
  }

  if (role === Role.DISPATCHER) {
    return "/dispatcher";
  }

  return "/advisor";
}
