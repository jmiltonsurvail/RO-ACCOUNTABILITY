export type CallStatusInput = {
  callAnsweredAt?: Date | string | null;
  callEndedAt?: Date | string | null;
  callState?: string | null;
  callerOutcome?: string | null;
  durationSeconds?: number | null;
  wasConnected?: boolean | null;
};

export type DerivedCallStatus =
  | "HUMAN_ANSWERED"
  | "VOICEMAIL_LEFT"
  | "VOICEMAIL_NO_MESSAGE"
  | "NO_ANSWER"
  | "IN_PROGRESS"
  | "PENDING";

function parseDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalize(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? null;
}

function isHumanAnsweredOutcome(callerOutcome: string | null) {
  return callerOutcome === "NORMAL" || callerOutcome === "ANSWERED";
}

function isVoicemailOutcome(callerOutcome: string | null) {
  return (
    callerOutcome === "VOICEMAIL" ||
    callerOutcome === "VOICE_MAIL" ||
    callerOutcome === "LEFT_VOICEMAIL"
  );
}

function getConnectedDurationSeconds(input: {
  callAnsweredAt?: Date | string | null;
  callEndedAt?: Date | string | null;
  durationSeconds?: number | null;
}) {
  const answeredAt = parseDate(input.callAnsweredAt);
  const endedAt = parseDate(input.callEndedAt);

  if (answeredAt && endedAt) {
    return Math.max(0, Math.round((endedAt.getTime() - answeredAt.getTime()) / 1000));
  }

  return input.durationSeconds ?? null;
}

export function getDerivedCallStatus(input: CallStatusInput): DerivedCallStatus {
  const callState = normalize(input.callState);
  const callerOutcome = normalize(input.callerOutcome);
  const answeredAt = parseDate(input.callAnsweredAt);
  const endedAt = parseDate(input.callEndedAt);
  const connectedDurationSeconds = getConnectedDurationSeconds(input);

  if (answeredAt) {
    if (isHumanAnsweredOutcome(callerOutcome)) {
      return "HUMAN_ANSWERED";
    }

    if (isVoicemailOutcome(callerOutcome)) {
      if (connectedDurationSeconds !== null && connectedDurationSeconds <= 15) {
        return "VOICEMAIL_NO_MESSAGE";
      }

      return "VOICEMAIL_LEFT";
    }

    if (!endedAt && (callState === "STARTING" || callState === "CONNECTED" || callState === "RINGING")) {
      return "IN_PROGRESS";
    }

    if (connectedDurationSeconds !== null && connectedDurationSeconds <= 15) {
      return "VOICEMAIL_NO_MESSAGE";
    }

    if (connectedDurationSeconds !== null && connectedDurationSeconds <= 45) {
      return "VOICEMAIL_LEFT";
    }

    return "HUMAN_ANSWERED";
  }

  if (callState === "STARTING" || callState === "CONNECTED" || callState === "RINGING") {
    return "IN_PROGRESS";
  }

  if (callState === "ENDING" || callState === "ENDED") {
    return "NO_ANSWER";
  }

  return "PENDING";
}

export function getDerivedCallStatusLabel(status: DerivedCallStatus) {
  switch (status) {
    case "HUMAN_ANSWERED":
      return "Human Answered";
    case "VOICEMAIL_LEFT":
      return "Left VM";
    case "VOICEMAIL_NO_MESSAGE":
      return "VM No Message";
    case "NO_ANSWER":
      return "No Answer";
    case "IN_PROGRESS":
      return "In Progress";
    default:
      return "Pending";
  }
}

export function getDerivedCallStatusClasses(status: DerivedCallStatus) {
  switch (status) {
    case "HUMAN_ANSWERED":
      return "bg-emerald-100 text-emerald-800";
    case "VOICEMAIL_LEFT":
      return "bg-amber-100 text-amber-900";
    case "VOICEMAIL_NO_MESSAGE":
      return "bg-orange-100 text-orange-900";
    case "NO_ANSWER":
      return "bg-rose-100 text-rose-700";
    case "IN_PROGRESS":
      return "bg-cyan-100 text-cyan-800";
    default:
      return "bg-slate-200 text-slate-700";
  }
}
