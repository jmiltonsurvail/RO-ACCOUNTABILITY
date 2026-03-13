import { clsx } from "clsx";
import { differenceInHours, format } from "date-fns";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "N/A";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return format(date, "MMM d, yyyy h:mm a");
}

export function formatDateOnly(value: Date | string | null | undefined) {
  if (!value) {
    return "N/A";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return format(date, "MMM d, yyyy");
}

export function hoursSince(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }
  return Math.max(differenceInHours(new Date(), date), 0);
}

export function parseOptionalInt(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? null : parsed;
}
