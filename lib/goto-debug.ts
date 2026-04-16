type GoToLogLevel = "error" | "info" | "warn";

function removeUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, removeUndefined(entry)]),
    );
  }

  return value;
}

export function logGoTo(level: GoToLogLevel, event: string, details?: Record<string, unknown>) {
  const logger =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;

  logger(`[GoTo] ${event}`, removeUndefined(details ?? {}));
}
