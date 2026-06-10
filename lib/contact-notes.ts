const AUTOMATED_TEXT_NOTE_PREFIXES = ["Text received:", "Text sent:"];
const AUTOMATED_TEXT_NOTE_MESSAGES = new Set([
  "Customer text response received.",
  "Inbound text message received.",
]);

export function isAutomatedTextContactNote(value: string | null | undefined) {
  const note = value?.trim();

  if (!note) {
    return false;
  }

  return (
    AUTOMATED_TEXT_NOTE_MESSAGES.has(note) ||
    AUTOMATED_TEXT_NOTE_PREFIXES.some((prefix) => note.startsWith(prefix))
  );
}

export function getDisplayCustomerNotes(value: string | null | undefined) {
  if (isAutomatedTextContactNote(value)) {
    return null;
  }

  return value ?? null;
}
