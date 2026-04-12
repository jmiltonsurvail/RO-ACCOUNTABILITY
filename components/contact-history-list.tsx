"use client";

import { useMemo, useState } from "react";
import { CallRecordModal } from "@/components/call-record-modal";
import { formatDateTime } from "@/lib/utils";

export type ContactHistoryEntry = {
  advisorLabel: string | null;
  contactedAt: string;
  customerNotes: string | null;
  linkedCallRecord: {
    callSessionId: string;
    callSummary: string | null;
    transcriptStatus: "FAILED" | "PENDING" | "PROCESSING" | "READY";
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

export function ContactHistoryList({
  entries,
}: {
  entries: ContactHistoryEntry[];
}) {
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(null);
  const selectedEntry =
    selectedEntryIndex !== null ? entries[selectedEntryIndex] ?? null : null;
  const selectedCallRecord = selectedEntry?.linkedCallRecord ?? null;
  const callEnabledCount = useMemo(
    () => entries.filter((entry) => Boolean(entry.linkedCallRecord)).length,
    [entries],
  );

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
        No contact timestamps logged yet.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Contact History
          </p>
          {callEnabledCount > 0 ? (
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {callEnabledCount} Call Record{callEnabledCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <div className="max-h-56 space-y-3 overflow-y-auto px-4 py-4">
          {entries.map((entry, index) => (
            <div
              className="rounded-2xl border border-white bg-white px-4 py-3 text-sm text-slate-700"
              key={`${entry.contactedAt}-${index}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                {entry.linkedCallRecord ? (
                  <button
                    className="text-left font-medium text-cyan-700 underline decoration-cyan-300 decoration-2 underline-offset-4 transition hover:text-cyan-900"
                    onClick={() => setSelectedEntryIndex(index)}
                    type="button"
                  >
                    {formatDateTime(entry.contactedAt)}
                  </button>
                ) : (
                  <p className="font-medium text-slate-950">{formatDateTime(entry.contactedAt)}</p>
                )}

                {entry.linkedCallRecord ? (
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getTranscriptStatusPillClasses(entry.linkedCallRecord.transcriptStatus)}`}
                  >
                    {getTranscriptStatusLabel(entry.linkedCallRecord.transcriptStatus)}
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
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
    </>
  );
}
