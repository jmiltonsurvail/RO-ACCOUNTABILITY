"use client";

import { type RepairValue } from "@prisma/client";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ContactHistoryList, type ContactHistoryEntry } from "@/components/contact-history-list";
import { GoToCallFeedback } from "@/components/goto-call-feedback";
import { TextConversation } from "@/components/text-conversation";
import { type TextMessageThreadEntry } from "@/components/text-message-thread";
import {
  getDerivedCallStatus,
  getDerivedCallStatusClasses,
  getDerivedCallStatusLabel,
} from "@/lib/call-session-status";
import { blockerReasonLabels, repairValueLabels } from "@/lib/constants";
import { hasRepairOrderContactToday } from "@/lib/repair-order-urgency";
import { cn, formatDateTime, hoursSince } from "@/lib/utils";

type AdvisorCallAttempt = {
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
  requestedAt: string;
  transcriptStatus: string;
  wasConnected: boolean | null;
};

function getCallAttemptTimestamp(
  callAttempt: {
    callAnsweredAt: string | null;
    callEndedAt: string | null;
    requestedAt?: string;
  } | null,
) {
  return callAttempt?.requestedAt ?? callAttempt?.callEndedAt ?? callAttempt?.callAnsweredAt ?? null;
}

function getRepairValueBadgeClasses(value: RepairValue) {
  if (value === "HIGH") {
    return "border-rose-700 bg-rose-600 text-white";
  }

  if (value === "MEDIUM") {
    return "border-amber-600 bg-amber-500 text-slate-950";
  }

  return "border-emerald-700 bg-emerald-600 text-white";
}

export type AdvisorRepairOrder = {
  advisorName: string | null;
  asmNumber: number;
  blockerState: {
    blockerReason: keyof typeof blockerReasonLabels;
    blockerStartedAt: string;
    foremanNotes: string | null;
    techPromisedDate: string | null;
  } | null;
  contactState: {
    contacted: boolean;
    hasRentalCar: boolean;
    customerNotes: string | null;
  } | null;
  callSessions: AdvisorCallAttempt[];
  contactRecords: ContactHistoryEntry[];
  textMessages: TextMessageThreadEntry[];
  customerName: string;
  mode: string;
  model: string;
  phone: string | null;
  priorityScore: number;
  promisedAtNormalized: string | null;
  repairValue: RepairValue | null;
  riskReason: string;
  roNumber: number;
  tag: string | null;
  techName: string | null;
  techNumber: number | null;
  unreadTextMessageCount: number;
  year: number;
};

export function AdvisorContactCard({
  repairOrder,
}: {
  repairOrder: AdvisorRepairOrder;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldReopenFromUrl = searchParams.get("openRo") === String(repairOrder.roNumber);
  const contactedToday = hasRepairOrderContactToday(repairOrder);
  const [isExpanded, setIsExpanded] = useState(shouldReopenFromUrl);

  const blocker = repairOrder.blockerState;
  const blockerLabel = blocker
    ? blockerReasonLabels[blocker.blockerReason]
    : "No blocker";
  const callHref = (() => {
    if (!repairOrder.phone) {
      return null;
    }

    const returnToParams = new URLSearchParams(searchParams.toString());
    returnToParams.delete("gotoCallMessage");
    returnToParams.delete("gotoCallRo");
    returnToParams.delete("gotoCallStatus");
    returnToParams.set("openRo", String(repairOrder.roNumber));
    const returnTo = returnToParams.size > 0 ? `${pathname}?${returnToParams.toString()}` : pathname;

    return `/api/goto-connect/call?ro=${repairOrder.roNumber}&returnTo=${encodeURIComponent(returnTo)}`;
  })();
  const contactRecordLabel = contactedToday
    ? "Contacted"
    : "Needs Contact";
  const contactRecordTone = contactedToday
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-900";
  const techLabel =
    repairOrder.techNumber !== null
      ? `Tech ${repairOrder.techNumber}${repairOrder.techName ? ` · ${repairOrder.techName}` : ""}`
      : "Tech Unassigned";
  const asmLabel = repairOrder.advisorName
    ? `ASM ${repairOrder.asmNumber} · ${repairOrder.advisorName}`
    : `ASM ${repairOrder.asmNumber}`;
  const latestCallSummary =
    repairOrder.callSessions.find((callSession) => callSession.callSummary)?.callSummary ??
    repairOrder.contactRecords.find((record) => record.linkedCallRecord?.callSummary)
      ?.linkedCallRecord?.callSummary ??
    null;
  const latestCallRecord =
    repairOrder.callSessions[0] ??
    repairOrder.contactRecords.find((record) => record.linkedCallRecord)?.linkedCallRecord ??
    null;
  const attemptedToday = Boolean(
    latestCallRecord &&
      new Date(getCallAttemptTimestamp(latestCallRecord) ?? "").toDateString() ===
        new Date().toDateString(),
  );

  return (
    <article
      className={cn(
        "rounded-lg border bg-white p-4",
        contactedToday ? "border-zinc-200" : "border-amber-200",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-zinc-900">
            RO {repairOrder.roNumber}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900">
            {repairOrder.customerName}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {repairOrder.year} {repairOrder.model} · {repairOrder.mode}
          </p>
        </div>
        <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold text-zinc-700">
          Priority {repairOrder.priorityScore}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
        <p>{asmLabel}</p>
        <p>{techLabel}</p>
        <p className="truncate">{blockerLabel}</p>
        <p>Due {formatDateTime(blocker?.techPromisedDate ?? repairOrder.promisedAtNormalized)}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", contactRecordTone)}>
          {contactRecordLabel}
        </span>
        {!contactedToday && attemptedToday && latestCallRecord ? (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getDerivedCallStatusClasses(
              getDerivedCallStatus(latestCallRecord),
            )}`}
          >
            Attempted: {getDerivedCallStatusLabel(getDerivedCallStatus(latestCallRecord))}
          </span>
        ) : null}
        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
          {repairOrder.riskReason}
        </span>
        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700">
          Tag {repairOrder.tag || "N/A"}
        </span>
        {repairOrder.repairValue ? (
          <span
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
              getRepairValueBadgeClasses(repairOrder.repairValue),
            )}
          >
            {repairValueLabels[repairOrder.repairValue]}
          </span>
        ) : null}
        {repairOrder.contactState?.hasRentalCar ? (
          <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            Rental
          </span>
        ) : null}
        {repairOrder.unreadTextMessageCount > 0 ? (
          <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-950">
            {repairOrder.unreadTextMessageCount} New Text
            {repairOrder.unreadTextMessageCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
        <button
          className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 hover:text-zinc-950"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          {isExpanded ? "Hide Details" : "View Details"}
        </button>
        {callHref ? (
          <a
            className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 hover:text-zinc-950"
            href={callHref}
          >
            Call Customer
          </a>
        ) : null}
      </div>

      {isExpanded ? (
        <>
          <div className="mt-4 grid gap-4 text-sm text-zinc-600 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Foreman notes</p>
              <p className="mt-2 leading-6 text-zinc-700">
                {blocker?.foremanNotes || "No notes entered."}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Timing</p>
              <p className="mt-2">
                Blocked for {blocker ? hoursSince(blocker.blockerStartedAt) : 0} hours
              </p>
              <p className="mt-1">
                Due:{" "}
                {formatDateTime(
                  blocker?.techPromisedDate ?? repairOrder.promisedAtNormalized,
                )}
              </p>
              <p className="mt-1">
                Last contact:{" "}
                {repairOrder.contactRecords[0]
                  ? formatDateTime(repairOrder.contactRecords[0].contactedAt)
                  : "No contact logged"}
              </p>
              <p className="mt-1">Phone: {repairOrder.phone || "N/A"}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-800">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                Rental car
              </p>
              <p className="mt-1 font-medium text-zinc-900">
                {repairOrder.contactState?.hasRentalCar ? "Yes" : "No"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-800">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                Repair Value
              </p>
              <p className="mt-1 font-medium text-zinc-900">
                {repairOrder.repairValue
                  ? repairValueLabels[repairOrder.repairValue]
                  : "Not set"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <GoToCallFeedback roNumber={repairOrder.roNumber} />
          </div>
          {repairOrder.phone ? (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <TextConversation
                initialMessages={repairOrder.textMessages}
                initialUnreadCount={repairOrder.unreadTextMessageCount}
                phone={repairOrder.phone}
                roNumber={repairOrder.roNumber}
              />
            </div>
          ) : null}
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Latest Call</p>
            {latestCallRecord ? (
              <>
                <span
                  className={`mt-2 inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${getDerivedCallStatusClasses(
                    getDerivedCallStatus(latestCallRecord),
                  )}`}
                >
                  {getDerivedCallStatusLabel(getDerivedCallStatus(latestCallRecord))}
                </span>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  {latestCallSummary || latestCallRecord.goToAiSummary || "No call summary yet."}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-zinc-700">No call record yet.</p>
            )}
          </div>
          <div className="mt-4">
            <ContactHistoryList entries={repairOrder.contactRecords} />
          </div>
          {!callHref ? (
            <div className="mt-4">
              <span className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-400">
                No Phone
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-4 grid gap-4">
          <div className="flex flex-wrap gap-4 text-sm text-zinc-600">
            <span>
              Last attempt{" "}
              {latestCallRecord
                ? formatDateTime(getCallAttemptTimestamp(latestCallRecord))
                : "No attempt logged"}
            </span>
            <span>
              Last contact{" "}
              {repairOrder.contactRecords[0]
                ? formatDateTime(repairOrder.contactRecords[0].contactedAt)
                : "No contact logged"}
            </span>
            <span>
              Due {formatDateTime(blocker?.techPromisedDate ?? repairOrder.promisedAtNormalized)}
            </span>
            <span>Phone {repairOrder.phone || "N/A"}</span>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                Contact History
              </p>
              <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-zinc-600">
                {repairOrder.contactRecords.length} Entr
                {repairOrder.contactRecords.length === 1 ? "y" : "ies"}
              </span>
            </div>
            {repairOrder.contactRecords.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600">No contact timestamps logged yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {repairOrder.contactRecords.slice(0, 2).map((record, index) => (
                  <div
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
                    key={`${record.contactedAt}-${index}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-zinc-900">
                        {formatDateTime(record.contactedAt)}
                      </p>
                      <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                        {record.advisorLabel || "Advisor"}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-zinc-600">
                      {record.customerNotes || "No customer notes."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
