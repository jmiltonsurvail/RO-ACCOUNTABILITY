"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";

type CallRecordSummary = {
  callSessionId: string;
  callSummary: string | null;
  transcriptStatus: "FAILED" | "PENDING" | "PROCESSING" | "READY";
};

type CallRecordModalProps = {
  callRecord: CallRecordSummary;
  contactTimestamp: string;
  onClose: () => void;
};

type CallRecordResponse = {
  audioUrl: string | null;
  callSession: {
    callSummary: string | null;
    callCreatedAt: string | null;
    callEndedAt: string | null;
    customerName: string;
    customerPhone: string | null;
    durationSeconds: number | null;
    id: string;
    repairOrderNumber: number;
    requestedAt: string;
    transcriptError: string | null;
    transcriptStatus: "FAILED" | "PENDING" | "PROCESSING" | "READY";
    transcriptText: string | null;
    wasConnected: boolean | null;
  };
};

function formatDuration(durationSeconds: number | null) {
  if (durationSeconds === null || durationSeconds < 0) {
    return "Unknown";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function getTranscriptStatusLabel(status: CallRecordSummary["transcriptStatus"]) {
  if (status === "READY") {
    return "Transcript Ready";
  }

  if (status === "PROCESSING") {
    return "Transcript Processing";
  }

  if (status === "FAILED") {
    return "Transcript Failed";
  }

  return "Transcript Pending";
}

export function CallRecordModal({
  callRecord,
  contactTimestamp,
  onClose,
}: CallRecordModalProps) {
  const [state, setState] = useState<{
    data: CallRecordResponse | null;
    error: string | null;
    loading: boolean;
  }>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCallRecord() {
      setState({
        data: null,
        error: null,
        loading: true,
      });

      try {
        const response = await fetch(`/api/call-sessions/${callRecord.callSessionId}`);
        const payload = (await response.json()) as CallRecordResponse | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Unable to load call record.",
          );
        }

        if (!cancelled) {
          setState({
            data: payload as CallRecordResponse,
            error: null,
            loading: false,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            error: error instanceof Error ? error.message : "Unable to load call record.",
            loading: false,
          });
        }
      }
    }

    void loadCallRecord();

    return () => {
      cancelled = true;
    };
  }, [callRecord.callSessionId]);

  const transcriptStatus = state.data?.callSession.transcriptStatus ?? callRecord.transcriptStatus;
  const callSummary = state.data?.callSession.callSummary ?? callRecord.callSummary;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Call Record</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Contacted {formatDateTime(contactTimestamp)}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{getTranscriptStatusLabel(transcriptStatus)}</p>
          </div>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-96px)] overflow-y-auto px-6 py-5">
          {state.loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
              Loading call record...
            </div>
          ) : state.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-sm text-rose-700">
              {state.error}
            </div>
          ) : state.data ? (
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Call Summary</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {callSummary || "No summary generated yet."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Call Details</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>RO {state.data.callSession.repairOrderNumber}</p>
                    <p>{state.data.callSession.customerName}</p>
                    <p>{state.data.callSession.customerPhone || "No phone on file"}</p>
                    <p>Call started {formatDateTime(state.data.callSession.requestedAt)}</p>
                    <p>
                      Tracking status{" "}
                      {state.data.callSession.wasConnected === true
                        ? "Connected"
                        : state.data.callSession.wasConnected === false
                          ? "Not connected"
                          : "Pending"}
                    </p>
                    <p>
                      Started{" "}
                      {state.data.callSession.callCreatedAt
                        ? formatDateTime(state.data.callSession.callCreatedAt)
                        : "Pending"}
                    </p>
                    <p>
                      Ended{" "}
                      {state.data.callSession.callEndedAt
                        ? formatDateTime(state.data.callSession.callEndedAt)
                        : "Pending"}
                    </p>
                    <p>Duration {formatDuration(state.data.callSession.durationSeconds)}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Player</p>
                  {state.data.audioUrl ? (
                    <audio className="mt-3 w-full" controls preload="metadata" src={state.data.audioUrl} />
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">Recording audio is not available yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Transcript</p>
                {state.data.callSession.transcriptError ? (
                  <p className="mt-3 text-sm text-rose-700">{state.data.callSession.transcriptError}</p>
                ) : state.data.callSession.transcriptText ? (
                  <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {state.data.callSession.transcriptText}
                  </pre>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Transcript is not available yet.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
