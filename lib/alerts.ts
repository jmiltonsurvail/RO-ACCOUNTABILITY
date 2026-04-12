import { AlertTrigger, type RepairValue } from "@prisma/client";
import { alertTriggerDescriptions, alertTriggerLabels } from "@/lib/constants";
import { getActiveRepairOrders } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import {
  compareRepairOrderUrgency,
  getRepairOrderBlockedHours,
  getRepairOrderUrgencyScore,
  isRepairOrderContactPastSla,
  isRepairOrderOverdue,
} from "@/lib/repair-order-urgency";
import { getSlaSettings } from "@/lib/sla-settings";

export const defaultAlertRules = [
  {
    enabled: true,
    name: "Overdue RO",
    trigger: AlertTrigger.OVERDUE,
  },
  {
    enabled: true,
    name: "Contact SLA Breached",
    trigger: AlertTrigger.CONTACT_SLA_BREACHED,
  },
  {
    enabled: true,
    name: "Blocked Aging Threshold",
    trigger: AlertTrigger.BLOCKED_AGING,
  },
  {
    enabled: true,
    name: "Rental Car Exposure",
    trigger: AlertTrigger.RENTAL_CAR,
  },
  {
    enabled: true,
    name: "High Repair Value",
    trigger: AlertTrigger.HIGH_REPAIR_VALUE,
  },
] as const;

export type AlertRuleRecord = {
  enabled: boolean;
  id: string;
  name: string;
  trigger: AlertTrigger;
};

type AlertRepairOrder = Awaited<ReturnType<typeof getActiveRepairOrders>>[number];

export type ManagerAlertItem = {
  advisorName: string | null;
  asmNumber: number;
  blockedHours: number;
  contactState: AlertRepairOrder["contactState"];
  customerName: string;
  matchedRules: Array<{
    description: string;
    label: string;
    trigger: AlertTrigger;
  }>;
  mode: string;
  model: string;
  priorityScore: number;
  repairValue: RepairValue | null;
  roNumber: number;
  tag: string | null;
  techName: string | null;
  techNumber: number | null;
  year: number;
};

async function syncDefaultAlertRules(organizationId: string) {
  await Promise.all(
    defaultAlertRules.map((rule) =>
      prisma.alertRule.upsert({
        create: {
          enabled: rule.enabled,
          name: rule.name,
          organizationId,
          trigger: rule.trigger,
        },
        update: {},
        where: {
          organizationId_trigger: {
            organizationId,
            trigger: rule.trigger,
          },
        },
      }),
    ),
  );
}

export async function getAlertRules(organizationId: string): Promise<AlertRuleRecord[]> {
  await syncDefaultAlertRules(organizationId);

  const rules = await prisma.alertRule.findMany({
    orderBy: {
      createdAt: "asc",
    },
    where: {
      organizationId,
    },
  });

  return rules.sort((left, right) => {
    const leftIndex = defaultAlertRules.findIndex((rule) => rule.trigger === left.trigger);
    const rightIndex = defaultAlertRules.findIndex((rule) => rule.trigger === right.trigger);
    return leftIndex - rightIndex;
  });
}

function doesRuleMatch(
  repairOrder: AlertRepairOrder,
  trigger: AlertTrigger,
  blockedAgingHours: number,
  dueSoonHours: number,
  contactSlaHours: number,
  now: Date,
) {
  const settings = {
    blockedAgingHours,
    contactSlaHours,
    dueSoonHours,
  };

  if (trigger === AlertTrigger.OVERDUE) {
    return isRepairOrderOverdue(repairOrder, now);
  }

  if (trigger === AlertTrigger.CONTACT_SLA_BREACHED) {
    return isRepairOrderContactPastSla(repairOrder, settings, now);
  }

  if (trigger === AlertTrigger.BLOCKED_AGING) {
    return (
      Boolean(repairOrder.blockerState?.isBlocked) &&
      getRepairOrderBlockedHours(repairOrder, now) >= blockedAgingHours
    );
  }

  if (trigger === AlertTrigger.RENTAL_CAR) {
    return Boolean(repairOrder.contactState?.hasRentalCar);
  }

  return repairOrder.repairValue === "HIGH";
}

export async function getManagerAlertsData(organizationId: string) {
  const [repairOrders, rules, slaSettings] = await Promise.all([
    getActiveRepairOrders(organizationId),
    getAlertRules(organizationId),
    getSlaSettings(organizationId),
  ]);
  const enabledRules = rules.filter((rule) => rule.enabled);
  const now = new Date();
  const sortedRepairOrders = [...repairOrders].sort((left, right) =>
    compareRepairOrderUrgency(left, right, slaSettings, now),
  );

  const items = sortedRepairOrders
    .map((repairOrder) => {
      const matchedRules = enabledRules
        .filter((rule) =>
          doesRuleMatch(
            repairOrder,
            rule.trigger,
            slaSettings.blockedAgingHours,
            slaSettings.dueSoonHours,
            slaSettings.contactSlaHours,
            now,
          ),
        )
        .map((rule) => ({
          description: alertTriggerDescriptions[rule.trigger],
          label: rule.name,
          trigger: rule.trigger,
        }));

      if (matchedRules.length === 0) {
        return null;
      }

      return {
        advisorName: repairOrder.advisorName,
        asmNumber: repairOrder.asmNumber,
        blockedHours: getRepairOrderBlockedHours(repairOrder, now),
        contactState: repairOrder.contactState,
        customerName: repairOrder.customerName,
        matchedRules,
        mode: repairOrder.mode,
        model: repairOrder.model,
        priorityScore: getRepairOrderUrgencyScore(repairOrder, slaSettings, now),
        repairValue: repairOrder.repairValue,
        roNumber: repairOrder.roNumber,
        tag: repairOrder.tag,
        techName: repairOrder.techName,
        techNumber: repairOrder.techNumber,
        year: repairOrder.year,
      } satisfies ManagerAlertItem;
    })
    .filter((item): item is ManagerAlertItem => item !== null);

  const countsByTrigger = rules.reduce(
    (accumulator, rule) => {
      accumulator[rule.trigger] = items.filter((item) =>
        item.matchedRules.some((matchedRule) => matchedRule.trigger === rule.trigger),
      ).length;
      return accumulator;
    },
    {
      BLOCKED_AGING: 0,
      CONTACT_SLA_BREACHED: 0,
      HIGH_REPAIR_VALUE: 0,
      OVERDUE: 0,
      RENTAL_CAR: 0,
    } satisfies Record<AlertTrigger, number>,
  );

  return {
    alertCount: items.length,
    countsByTrigger,
    items,
    rules,
    slaSettings,
    summaryCards: [
      {
        count: items.length,
        label: "Active Alerts",
        tone: "bg-slate-950 text-white",
      },
      {
        count: countsByTrigger.OVERDUE,
        label: alertTriggerLabels.OVERDUE,
        tone: "bg-rose-100 text-rose-800",
      },
      {
        count: countsByTrigger.CONTACT_SLA_BREACHED,
        label: alertTriggerLabels.CONTACT_SLA_BREACHED,
        tone: "bg-amber-100 text-amber-900",
      },
      {
        count: countsByTrigger.BLOCKED_AGING,
        label: alertTriggerLabels.BLOCKED_AGING,
        tone: "bg-cyan-100 text-cyan-900",
      },
      {
        count: countsByTrigger.RENTAL_CAR,
        label: alertTriggerLabels.RENTAL_CAR,
        tone: "bg-rose-600 text-white",
      },
      {
        count: countsByTrigger.HIGH_REPAIR_VALUE,
        label: alertTriggerLabels.HIGH_REPAIR_VALUE,
        tone: "bg-emerald-100 text-emerald-900",
      },
    ],
  };
}

export async function getManagerAlertCount(organizationId: string) {
  const alertData = await getManagerAlertsData(organizationId);
  return alertData.alertCount;
}
