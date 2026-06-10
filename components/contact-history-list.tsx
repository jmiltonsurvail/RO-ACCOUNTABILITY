"use client";

import { useMemo, useState } from "react";
import { CallRecordModal } from "@/components/call-record-modal";
import { TextMessageThread, type TextMessageThreadEntry } from "@/components/text-message-thread";
import {
  getCallDirectionClasses,
  getCallDirectionLabel,
  getDerivedCallStatus,
  getDerivedCallStatusClasses,
  getDerivedCallStatusLabel,
  isMissedInboundCall,
} from "@/lib/call-session-status";
import { formatDateTime } from "@/lib/utils";

export type ContactHistoryEntry = {
  advisorLabel: string | null;
  contactedAt: string;
  customerNotes: string | null;
  linkedCallRecord: {
    callAnsweredAt: string | null;
    callDirection?: string | null;
    callEndedAt: string | null;
    callSessionId: string;
    callSummary: string | null;
    callState: string | null;
    callerOutcome: string | null;
    durationSeconds: number | null;
    goToAiSummary: string | null;
    goToPrimaryRecordingId: string | null;
    missedInboundCall?: boolean | null;
    transcriptStatus: "FAILED" | "PENDING" | "PROCESSING" | "READY";
    wasConnected: boolean | null;
  } | null;
  linkedTextConversation?: {
    customerName: string;
    customerPhone: string | null;
    messages: TextMessageThreadEntry[];
    roNumber: number;
  } | null;
};

function getTranscriptStatusPillClasses(
  status: NonNullable<ContactHistoryEntry["linkedCallRecord"]>["transcriptStatus"],
) {
  if (status === "READY") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "PROCESSING") {
    return "bg-amber-100 text-amber-900";
  }

  if (status === "FAILED") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-200 text-slate-700";
}

function getTranscriptStatusLabel(
  status: NonNullable<ContactHistoryEntry["linkedCallRecord"]>["transcriptStatus"],
) {
  if (status === "READY") {
    return "Transcript";
  }

  if (status === "PROCESSING") {
    return "Processing";
  }

  if (status === "FAILED") {
    return "Failed";
  }

  return "Pending";
}

function TextConversationModal({
  contactTimestamp,
  conversation,
  onClose,
}: {
  contactTimestamp: string;
  conversation: NonNullable<ContactHistoryEntry["linkedTextConversation"]>;
  onClose: () => void;
}) {
  const latestMessageId = conversation.messages[conversation.messages.length - 1]?.id ?? null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/60 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
              Text Conversation
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-900">
              RO {conversation.roNumber} · {conversation.customerName}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {conversation.customerPhone || "No phone on file"} · Contacted{" "}
              {formatDateTime(contactTimestamp)}
            </p>
          </div>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="max-h-[calc(90vh-112px)] overflow-y-auto px-6 py-5">
          <TextMessageThread latestMessageId={latestMessageId} messages={conversation.messages} />
        </div>
      </div>
    </div>
  );
}

export function ContactHistoryList({
  entries,
}: {
  entries: ContactHistoryEntry[];
}) {
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(null);
  const selectedEntry =
    selectedEntryIndex !== null ? entries[selectedEntryIndex] ?? null : null;
  const selectedCallRecord = selectedEntry?.linkedCallRecord ?? null;
  const selectedTextConversation = selectedEntry?.linkedTextConversation ?? null;
  const callEnabledCount = useMemo(
    () => entries.filter((entry) => Boolean(entry.linkedCallRecord)).length,
    [entries],
  );
  const textEnabledCount = useMemo(
    () => entries.filter((entry) => Boolean(entry.linkedTextConversation)).length,
    [entries],
  );

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
        No contact timestamps logged yet.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Contact History
          </p>
          {callEnabledCount > 0 ? (
            <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-zinc-600">
              {callEnabledCount} Call Record{callEnabledCount === 1 ? "" : "s"}
            </span>
          ) : null}
          {textEnabledCount > 0 ? (
            <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-zinc-600">
              {textEnabledCount} Text Thread{textEnabledCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <div className="max-h-56 space-y-3 overflow-y-auto px-4 py-4">
          {entries.map((entry, index) => (
            <div
              className="rounded-md border border-white bg-white px-4 py-3 text-sm text-zinc-700"
              key={`${entry.contactedAt}-${index}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                {entry.linkedCallRecord || entry.linkedTextConversation ? (
                  <button
                    className="text-left font-medium text-zinc-900 underline decoration-zinc-300 decoration-2 underline-offset-4 transition hover:text-zinc-700"
                    onClick={() => setSelectedEntryIndex(index)}
                    type="button"
                  >
                    {formatDateTime(entry.contactedAt)}
                  </button>
                ) : (
                  <p className="font-medium text-zinc-900">{formatDateTime(entry.contactedAt)}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {entry.linkedCallRecord ? (
                    <>
                    <span
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold ${getCallDirectionClasses(
                        entry.linkedCallRecord,
                      )}`}
                    >
                      {getCallDirectionLabel(entry.linkedCallRecord)}
                    </span>
                    {isMissedInboundCall(entry.linkedCallRecord) ? (
                      <span className="rounded-md bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white">
                        Missed Inbound
                      </span>
                    ) : null}
                    <span
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold ${getDerivedCallStatusClasses(
                        getDerivedCallStatus(entry.linkedCallRecord),
                      )}`}
                    >
                      {getDerivedCallStatusLabel(getDerivedCallStatus(entry.linkedCallRecord))}
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold ${getTranscriptStatusPillClasses(entry.linkedCallRecord.transcriptStatus)}`}
                    >
                      {getTranscriptStatusLabel(entry.linkedCallRecord.transcriptStatus)}
                    </span>
                    </>
                  ) : null}
                  {entry.linkedTextConversation ? (
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">
                      Text Thread
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-500">
                {entry.advisorLabel || "Advisor"}
              </p>
              {entry.customerNotes ? (
                <p className="mt-2 leading-6 text-slate-600">{entry.customerNotes}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {selectedEntry && selectedCallRecord ? (
        <CallRecordModal
          callRecord={selectedCallRecord}
          contactTimestamp={selectedEntry.contactedAt}
          onClose={() => setSelectedEntryIndex(null)}
        />
      ) : null}
      {selectedEntry && selectedTextConversation ? (
        <TextConversationModal
          contactTimestamp={selectedEntry.contactedAt}
          conversation={selectedTextConversation}
          onClose={() => setSelectedEntryIndex(null)}
        />
      ) : null}
    </>
  );
}
