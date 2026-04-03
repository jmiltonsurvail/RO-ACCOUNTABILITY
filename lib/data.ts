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

const managerReportRangeConfig = {
  "7d": { days: 7, label: "Last 7 Days" },
  "30d": { days: 30, label: "Last 30 Days" },
  "90d": { days: 90, label: "Last 90 Days" },
  all: { days: null, label: "All Time" },
} as const;

export type ManagerReportRange = keyof typeof managerReportRangeConfig;

function getManagerReportSinceDate(range: ManagerReportRange, now: Date) {
  const config = managerReportRangeConfig[range];

  if (config.days === null) {
    return null;
  }

  return new Date(now.getTime() - config.days * 24 * 60 * 60 * 1000);
}

function formatReportUserLabel(input: {
  email: string;
  fallback: string;
  name: string | null;
}) {
  return input.name?.trim() || input.email || input.fallback;
}

function getRepairOrderDueDate(repairOrder: {
  blockerState: { isBlocked: boolean; techPromisedDate: Date | null } | null;
  promisedAtNormalized: Date | null;
}) {
  return repairOrder.blockerState?.techPromisedDate ?? repairOrder.promisedAtNormalized;
}

function isRepairOrderOverdue(repairOrder: {
  blockerState: { isBlocked: boolean; techPromisedDate: Date | null } | null;
  promisedAtNormalized: Date | null;
}) {
  const dueDate = getRepairOrderDueDate(repairOrder);
  return Boolean(dueDate && dueDate < new Date());
}

export function normalizeManagerReportRange(
  range: string | null | undefined,
): ManagerReportRange {
  if (range === "30d" || range === "90d" || range === "all") {
    return range;
  }

  return "7d";
}

export function getManagerReportRangeLabel(range: ManagerReportRange) {
  return managerReportRangeConfig[range].label;
}

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

export async function getManagerReportsData(rangeInput?: string | null) {
  const range = normalizeManagerReportRange(rangeInput);
  const now = new Date();
  const since = getManagerReportSinceDate(range, now);

  const [activeRepairOrders, users, activities] = await Promise.all([
    prisma.repairOrder.findMany({
      where: { isActive: true },
      orderBy: [{ asmNumber: "asc" }, { roNumber: "asc" }],
      include: {
        blockerState: true,
        contactState: true,
      },
    }),
    prisma.user.findMany({
      select: {
        active: true,
        asmNumber: true,
        email: true,
        id: true,
        name: true,
        role: true,
        techNumber: true,
      },
      where: {
        OR: [
          {
            asmNumber: {
              not: null,
            },
            role: Role.ADVISOR,
          },
          {
            role: Role.TECH,
            techNumber: {
              not: null,
            },
          },
          {
            role: {
              in: [Role.DISPATCHER, Role.MANAGER],
            },
          },
        ],
      },
    }),
    prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            asmNumber: true,
            email: true,
            id: true,
            name: true,
            role: true,
            techNumber: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      where: {
        ...(since
          ? {
              createdAt: {
                gte: since,
              },
            }
          : {}),
        type: {
          in: [
            ActivityType.BLOCKER_UPSERTED,
            ActivityType.BLOCKER_CLEARED,
            ActivityType.CONTACT_RESET,
            ActivityType.CONTACT_UPDATED,
          ],
        },
      },
    }),
  ]);

  const advisorUsersByAsm = new Map(
    users
      .filter((user) => user.role === Role.ADVISOR && user.asmNumber !== null)
      .map((user) => [
        user.asmNumber as number,
        {
          active: user.active,
          label: formatReportUserLabel({
            email: user.email,
            fallback: `ASM ${user.asmNumber}`,
            name: user.name,
          }),
        },
      ]),
  );

  const techUsersByNumber = new Map(
    users
      .filter((user) => user.role === Role.TECH && user.techNumber !== null)
      .map((user) => [
        user.techNumber as number,
        {
          active: user.active,
          label: formatReportUserLabel({
            email: user.email,
            fallback: `Tech ${user.techNumber}`,
            name: user.name,
          }),
        },
      ]),
  );

  const techSummaryMap = new Map<
    string,
    {
      activeAssigned: number;
      avgBlockedHours: number | null;
      blockedCount: number;
      displayName: string;
      key: string;
      needsContactCount: number;
      overdueCount: number;
      techNumber: number | null;
      totalBlockedHours: number;
    }
  >();

  const advisorSummaryMap = new Map<
    number,
    {
      activeAssigned: number;
      advisorName: string;
      asmNumber: number;
      blockedCount: number;
      contactRate: number | null;
      contactedBlockedCount: number;
      notContactedBlockedCount: number;
      overdueCount: number;
      recentContactUpdates: number;
    }
  >();

  const dispatcherSummaryMap = new Map<
    string,
    {
      blockerClears: number;
      blockerUpdates: number;
      contactResets: number;
      contactUpdates: number;
      currentBlockedOwned: number;
      displayName: string;
      role: Role;
      userId: string;
    }
  >();

  for (const user of users) {
    if (user.role !== Role.DISPATCHER || !user.active) {
      continue;
    }

    dispatcherSummaryMap.set(user.id, {
      blockerClears: 0,
      blockerUpdates: 0,
      contactResets: 0,
      contactUpdates: 0,
      currentBlockedOwned: 0,
      displayName: formatReportUserLabel({
        email: user.email,
        fallback: "Dispatcher",
        name: user.name,
      }),
      role: user.role,
      userId: user.id,
    });
  }

  for (const repairOrder of activeRepairOrders) {
    const blocked = Boolean(repairOrder.blockerState?.isBlocked);
    const overdue = isRepairOrderOverdue(repairOrder);
    const needsContact = blocked && !repairOrder.contactState?.contacted;

    const techKey =
      repairOrder.techNumber !== null
        ? `tech-${repairOrder.techNumber}`
        : "tech-unassigned";
    const techFallbackLabel =
      repairOrder.techNumber !== null
        ? techUsersByNumber.get(repairOrder.techNumber)?.label ??
          repairOrder.techName ??
          `Tech ${repairOrder.techNumber}`
        : "Unassigned";
    const techSummary = techSummaryMap.get(techKey) ?? {
      activeAssigned: 0,
      avgBlockedHours: null,
      blockedCount: 0,
      displayName: techFallbackLabel,
      key: techKey,
      needsContactCount: 0,
      overdueCount: 0,
      techNumber: repairOrder.techNumber,
      totalBlockedHours: 0,
    };

    techSummary.activeAssigned += 1;

    if (blocked && repairOrder.blockerState) {
      techSummary.blockedCount += 1;
      techSummary.totalBlockedHours += differenceInHours(
        now,
        repairOrder.blockerState.blockerStartedAt,
      );
    }

    if (overdue) {
      techSummary.overdueCount += 1;
    }

    if (needsContact) {
      techSummary.needsContactCount += 1;
    }

    techSummaryMap.set(techKey, techSummary);

    const advisorSummary = advisorSummaryMap.get(repairOrder.asmNumber) ?? {
      activeAssigned: 0,
      advisorName:
        advisorUsersByAsm.get(repairOrder.asmNumber)?.label ??
        repairOrder.advisorName ??
        `ASM ${repairOrder.asmNumber}`,
      asmNumber: repairOrder.asmNumber,
      blockedCount: 0,
      contactRate: null,
      contactedBlockedCount: 0,
      notContactedBlockedCount: 0,
      overdueCount: 0,
      recentContactUpdates: 0,
    };

    advisorSummary.activeAssigned += 1;

    if (blocked) {
      advisorSummary.blockedCount += 1;

      if (repairOrder.contactState?.contacted) {
        advisorSummary.contactedBlockedCount += 1;
      } else {
        advisorSummary.notContactedBlockedCount += 1;
      }
    }

    if (overdue) {
      advisorSummary.overdueCount += 1;
    }

    advisorSummaryMap.set(repairOrder.asmNumber, advisorSummary);

    if (blocked && repairOrder.blockerState?.dispatcherUserId) {
      const dispatcherUser = users.find(
        (user) => user.id === repairOrder.blockerState?.dispatcherUserId,
      );

      if (dispatcherUser) {
        const dispatcherSummary = dispatcherSummaryMap.get(dispatcherUser.id) ?? {
          blockerClears: 0,
          blockerUpdates: 0,
          contactResets: 0,
          contactUpdates: 0,
          currentBlockedOwned: 0,
          displayName: formatReportUserLabel({
            email: dispatcherUser.email,
            fallback: dispatcherUser.role === Role.MANAGER ? "Manager" : "Dispatcher",
            name: dispatcherUser.name,
          }),
          role: dispatcherUser.role,
          userId: dispatcherUser.id,
        };

        dispatcherSummary.currentBlockedOwned += 1;
        dispatcherSummaryMap.set(dispatcherUser.id, dispatcherSummary);
      }
    }
  }

  for (const advisorSummary of advisorSummaryMap.values()) {
    advisorSummary.contactRate =
      advisorSummary.blockedCount === 0
        ? null
        : Math.round(
            (advisorSummary.contactedBlockedCount / advisorSummary.blockedCount) *
              100,
          );
  }

  for (const techSummary of techSummaryMap.values()) {
    techSummary.avgBlockedHours =
      techSummary.blockedCount === 0
        ? null
        : Math.round((techSummary.totalBlockedHours / techSummary.blockedCount) * 10) /
          10;
  }

  for (const activity of activities) {
    if (!activity.user) {
      continue;
    }

    if (
      activity.type === ActivityType.CONTACT_UPDATED &&
      activity.user.role === Role.ADVISOR &&
      activity.user.asmNumber !== null
    ) {
      const advisorSummary = advisorSummaryMap.get(activity.user.asmNumber);

      if (advisorSummary) {
        advisorSummary.recentContactUpdates += 1;
      }
    }

    if (
      activity.user.role === Role.DISPATCHER ||
      activity.user.role === Role.MANAGER
    ) {
      const dispatcherSummary = dispatcherSummaryMap.get(activity.user.id) ?? {
        blockerClears: 0,
        blockerUpdates: 0,
        contactResets: 0,
        contactUpdates: 0,
        currentBlockedOwned: 0,
        displayName: formatReportUserLabel({
          email: activity.user.email,
          fallback:
            activity.user.role === Role.MANAGER ? "Manager" : "Dispatcher",
          name: activity.user.name,
        }),
        role: activity.user.role,
        userId: activity.user.id,
      };

      if (activity.type === ActivityType.BLOCKER_UPSERTED) {
        dispatcherSummary.blockerUpdates += 1;
      }

      if (activity.type === ActivityType.BLOCKER_CLEARED) {
        dispatcherSummary.blockerClears += 1;
      }

      if (activity.type === ActivityType.CONTACT_RESET) {
        dispatcherSummary.contactResets += 1;
      }

      if (activity.type === ActivityType.CONTACT_UPDATED) {
        dispatcherSummary.contactUpdates += 1;
      }

      dispatcherSummaryMap.set(activity.user.id, dispatcherSummary);
    }
  }

  const activeBlocked = activeRepairOrders.filter((repairOrder) =>
    Boolean(repairOrder.blockerState?.isBlocked),
  );
  const activeOverdue = activeRepairOrders.filter((repairOrder) =>
    isRepairOrderOverdue(repairOrder),
  );
  const needsContact = activeRepairOrders.filter(
    (repairOrder) =>
      repairOrder.blockerState?.isBlocked && !repairOrder.contactState?.contacted,
  );

  return {
    advisorRows: Array.from(advisorSummaryMap.values()).sort((left, right) => {
      if (left.notContactedBlockedCount !== right.notContactedBlockedCount) {
        return right.notContactedBlockedCount - left.notContactedBlockedCount;
      }

      if (left.blockedCount !== right.blockedCount) {
        return right.blockedCount - left.blockedCount;
      }

      return left.asmNumber - right.asmNumber;
    }),
    dispatcherRows: Array.from(dispatcherSummaryMap.values()).sort(
      (left, right) => {
        const leftActions =
          left.blockerUpdates +
          left.blockerClears +
          left.contactResets +
          left.contactUpdates;
        const rightActions =
          right.blockerUpdates +
          right.blockerClears +
          right.contactResets +
          right.contactUpdates;

        if (leftActions !== rightActions) {
          return rightActions - leftActions;
        }

        if (left.currentBlockedOwned !== right.currentBlockedOwned) {
          return right.currentBlockedOwned - left.currentBlockedOwned;
        }

        return left.displayName.localeCompare(right.displayName);
      },
    ),
    generatedAt: now,
    range,
    rangeLabel: getManagerReportRangeLabel(range),
    summary: {
      activeRepairOrders: activeRepairOrders.length,
      activeBlocked: activeBlocked.length,
      activeOverdue: activeOverdue.length,
      needsContact: needsContact.length,
      periodBlockerUpdates: activities.filter(
        (activity) => activity.type === ActivityType.BLOCKER_UPSERTED,
      ).length,
      periodContactUpdates: activities.filter(
        (activity) => activity.type === ActivityType.CONTACT_UPDATED,
      ).length,
    },
    techRows: Array.from(techSummaryMap.values()).sort((left, right) => {
      if (left.overdueCount !== right.overdueCount) {
        return right.overdueCount - left.overdueCount;
      }

      if (left.blockedCount !== right.blockedCount) {
        return right.blockedCount - left.blockedCount;
      }

      if (left.activeAssigned !== right.activeAssigned) {
        return right.activeAssigned - left.activeAssigned;
      }

      return left.displayName.localeCompare(right.displayName);
    }),
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

  if (role === Role.TECH) {
    return "/login";
  }

  return "/advisor";
}
