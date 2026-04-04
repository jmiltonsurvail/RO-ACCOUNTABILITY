import { type RepairValue } from "@prisma/client";

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

export function isRepairOrderAtRisk(
  repairOrder: RepairOrderUrgencyInput,
  now: Date = new Date(),
) {
  return Boolean(
    isRepairOrderOverdue(repairOrder, now) ||
      needsRepairOrderContact(repairOrder) ||
      repairOrder.contactState?.hasRentalCar ||
      repairOrder.repairValue === "HIGH" ||
      getRepairOrderBlockedHours(repairOrder, now) >= 8,
  );
}

export function getRepairOrderUrgencyScore(
  repairOrder: RepairOrderUrgencyInput,
  now: Date = new Date(),
) {
  const blocked = isRepairOrderBlocked(repairOrder);
  const overdue = isRepairOrderOverdue(repairOrder, now);
  const dueToday = isRepairOrderDueToday(repairOrder, now);
  const needsContact = needsRepairOrderContact(repairOrder);
  const blockedHours = getRepairOrderBlockedHours(repairOrder, now);

  let score = 0;

  if (overdue) {
    score += 120;
  }

  if (needsContact) {
    score += 90;
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
    score += Math.max(0, 12 - Math.min(hoursUntilDue, 12));
  }

  return score;
}

export function compareRepairOrderUrgency(
  left: RepairOrderUrgencyInput,
  right: RepairOrderUrgencyInput,
  now: Date = new Date(),
) {
  const scoreDifference =
    getRepairOrderUrgencyScore(right, now) - getRepairOrderUrgencyScore(left, now);

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
