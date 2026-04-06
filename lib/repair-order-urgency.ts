import { type RepairValue } from "@prisma/client";
import {
  defaultSlaSettings,
  type SlaSettingsValues,
} from "@/lib/sla-settings";

type MaybeDate = Date | string | null;

type RepairOrderUrgencyInput = {
  blockerState: {
    blockerStartedAt: Date | string;
    isBlocked?: boolean;
    techPromisedDate: MaybeDate;
  } | null;
  contactState: {
    contacted: boolean;
    hasRentalCar?: boolean;
  } | null;
  promisedAtNormalized: MaybeDate;
  repairValue?: RepairValue | null;
  roNumber: number;
};

function parseDate(value: MaybeDate) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveUrgencyInputs(
  settingsOrNow?: Date | SlaSettingsValues,
  nowInput?: Date,
) {
  if (settingsOrNow instanceof Date) {
    return {
      now: settingsOrNow,
      settings: defaultSlaSettings,
    };
  }

  return {
    now: nowInput ?? new Date(),
    settings: settingsOrNow ?? defaultSlaSettings,
  };
}

export function getRepairOrderDueDate(repairOrder: RepairOrderUrgencyInput) {
  return parseDate(
    repairOrder.blockerState?.techPromisedDate ?? repairOrder.promisedAtNormalized,
  );
}

export function getRepairOrderBlockedHours(
  repairOrder: RepairOrderUrgencyInput,
  now: Date = new Date(),
) {
  const startedAt = parseDate(repairOrder.blockerState?.blockerStartedAt ?? null);

  if (!startedAt) {
    return 0;
  }

  return Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60)));
}

export function isRepairOrderBlocked(repairOrder: RepairOrderUrgencyInput) {
  return Boolean(repairOrder.blockerState?.isBlocked ?? repairOrder.blockerState);
}

export function isRepairOrderOverdue(
  repairOrder: RepairOrderUrgencyInput,
  now: Date = new Date(),
) {
  const dueDate = getRepairOrderDueDate(repairOrder);
  return Boolean(dueDate && dueDate < now);
}

export function isRepairOrderDueToday(
  repairOrder: RepairOrderUrgencyInput,
  now: Date = new Date(),
) {
  const dueDate = getRepairOrderDueDate(repairOrder);

  if (!dueDate) {
    return false;
  }

  return dueDate.toDateString() === now.toDateString() && dueDate >= now;
}

export function needsRepairOrderContact(repairOrder: RepairOrderUrgencyInput) {
  return isRepairOrderBlocked(repairOrder) && !repairOrder.contactState?.contacted;
}

export function isRepairOrderContactPastSla(
  repairOrder: RepairOrderUrgencyInput,
  settingsOrNow?: Date | SlaSettingsValues,
  nowInput?: Date,
) {
  const { now, settings } = resolveUrgencyInputs(settingsOrNow, nowInput);

  return (
    needsRepairOrderContact(repairOrder) &&
    getRepairOrderBlockedHours(repairOrder, now) >= settings.contactSlaHours
  );
}

export function isRepairOrderAtRisk(
  repairOrder: RepairOrderUrgencyInput,
  settingsOrNow?: Date | SlaSettingsValues,
  nowInput?: Date,
) {
  const { now, settings } = resolveUrgencyInputs(settingsOrNow, nowInput);

  return Boolean(
    isRepairOrderOverdue(repairOrder, now) ||
      isRepairOrderContactPastSla(repairOrder, settings, now) ||
      repairOrder.contactState?.hasRentalCar ||
      repairOrder.repairValue === "HIGH" ||
      getRepairOrderBlockedHours(repairOrder, now) >= settings.blockedAgingHours
  );
}

export function getRepairOrderUrgencyScore(
  repairOrder: RepairOrderUrgencyInput,
  settingsOrNow?: Date | SlaSettingsValues,
  nowInput?: Date,
) {
  const { now, settings } = resolveUrgencyInputs(settingsOrNow, nowInput);
  const blocked = isRepairOrderBlocked(repairOrder);
  const overdue = isRepairOrderOverdue(repairOrder, now);
  const dueToday = isRepairOrderDueToday(repairOrder, now);
  const needsContact = needsRepairOrderContact(repairOrder);
  const contactPastSla = isRepairOrderContactPastSla(repairOrder, settings, now);
  const blockedHours = getRepairOrderBlockedHours(repairOrder, now);

  let score = 0;

  if (overdue) {
    score += 120;
  }

  if (needsContact) {
    score += 70;
  }

  if (contactPastSla) {
    score += 28;
  }

  if (repairOrder.contactState?.hasRentalCar) {
    score += 50;
  }

  if (repairOrder.repairValue === "HIGH") {
    score += 40;
  } else if (repairOrder.repairValue === "MEDIUM") {
    score += 20;
  }

  if (blocked) {
    score += 25;
  }

  if (dueToday) {
    score += 18;
  }

  score += Math.min(blockedHours, 24);

  const dueDate = getRepairOrderDueDate(repairOrder);
  if (!dueDate) {
    score += 6;
  } else if (!overdue) {
    const hoursUntilDue = Math.max(
      0,
      Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)),
    );
    score += Math.max(0, settings.dueSoonHours - Math.min(hoursUntilDue, settings.dueSoonHours));
  }

  return score;
}

export function compareRepairOrderUrgency(
  left: RepairOrderUrgencyInput,
  right: RepairOrderUrgencyInput,
  settingsOrNow?: Date | SlaSettingsValues,
  nowInput?: Date,
) {
  const { now, settings } = resolveUrgencyInputs(settingsOrNow, nowInput);
  const scoreDifference =
    getRepairOrderUrgencyScore(right, settings, now) -
    getRepairOrderUrgencyScore(left, settings, now);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const leftDueDate = getRepairOrderDueDate(left);
  const rightDueDate = getRepairOrderDueDate(right);

  if (leftDueDate && rightDueDate) {
    return leftDueDate.getTime() - rightDueDate.getTime();
  }

  if (leftDueDate || rightDueDate) {
    return leftDueDate ? -1 : 1;
  }

  return left.roNumber - right.roNumber;
}
