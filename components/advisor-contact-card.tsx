"use client";

import { type RepairValue } from "@prisma/client";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { updateContactAction, type ActionState } from "@/app/advisor/actions";
import { ContactHistoryList } from "@/components/contact-history-list";
import { GoToCallFeedback } from "@/components/goto-call-feedback";
import { blockerReasonLabels, repairValueLabels, repairValueOptions } from "@/lib/constants";
import { formatDateTime, hoursSince } from "@/lib/utils";

const initialState: ActionState = {};

function getRepairValueBadgeClasses(value: RepairValue) {
  if (value === "HIGH") {
    return "border-rose-700 bg-rose-600 text-white";
  }

  if (value === "MEDIUM") {
    return "border-amber-600 bg-amber-500 text-slate-950";
  }

  return "border-emerald-700 bg-emerald-600 text-white";
}

type AdvisorRepairOrder = {
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
  contactRecords: Array<{
    advisorLabel: string | null;
    contactedAt: string;
    customerNotes: string | null;
  }>;
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
  year: number;
};

export function AdvisorContactCard({
  repairOrder,
}: {
  repairOrder: AdvisorRepairOrder;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(updateContactAction, initialState);
  const [isExpanded, setIsExpanded] = useState(!(repairOrder.contactState?.contacted ?? false));
  const [notesValue, setNotesValue] = useState(
    repairOrder.contactState?.customerNotes ?? "",
  );
  const contactedValue =
    notesValue.trim().length > 0 || (repairOrder.contactState?.contacted ?? false);
  const handleSaved = useEffectEvent(() => {
    setNotesValue("");
    if (contactedValue) {
      setIsExpanded(false);
    }
    router.refresh();
  });

  useEffect(() => {
    if (state.saved) {
      handleSaved();
    }
  }, [state.saved]);

  const blocker = repairOrder.blockerState;
  const blockerLabel = blocker
    ? blockerReasonLabels[blocker.blockerReason]
    : "No blocker";
  const callHref = repairOrder.phone
    ? `/api/goto-connect/call?ro=${repairOrder.roNumber}&returnTo=${encodeURIComponent(pathname)}`
    : null;
  const contactRecordLabel = repairOrder.contactState?.contacted
    ? "Contacted"
    : "No Contact";
  const contactRecordTone = repairOrder.contactState?.contacted
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-700";
  const techLabel =
    repairOrder.techNumber !== null
      ? `Tech ${repairOrder.techNumber}${repairOrder.techName ? ` · ${repairOrder.techName}` : ""}`
      : "Tech Unassigned";
  const asmLabel = repairOrder.advisorName
    ? `ASM ${repairOrder.asmNumber} · ${repairOrder.advisorName}`
    : `ASM ${repairOrder.asmNumber}`;

  return (
    <form
      action={formAction}
      className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <input name="roNumber" type="hidden" value={repairOrder.roNumber} />
      <input name="contacted" type="hidden" value={contactedValue ? "true" : "false"} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              RO {repairOrder.roNumber}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
              {techLabel}
            </span>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Tag {repairOrder.tag || "N/A"}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
              {repairOrder.mode}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
              {asmLabel}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${contactRecordTone}`}
            >
              {contactRecordLabel}
            </span>
            {repairOrder.repairValue ? (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getRepairValueBadgeClasses(repairOrder.repairValue)}`}
              >
                Repair Value {repairValueLabels[repairOrder.repairValue]}
              </span>
            ) : null}
            {repairOrder.contactState?.hasRentalCar ? (
              <span className="inline-flex animate-pulse items-center justify-center rounded-full border border-rose-700 bg-rose-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                Rental Car
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-950">
            {repairOrder.customerName}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {repairOrder.year} {repairOrder.model}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-cyan-400 hover:text-slate-950"
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
          >
            {isExpanded ? "Close" : "Open"}
          </button>
          <div className="rounded-3xl bg-slate-950 px-4 py-2 text-sm text-white">
            {blockerLabel}
          </div>
          <div className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
            {repairOrder.riskReason}
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
            Priority {repairOrder.priorityScore}
          </div>
        </div>
      </div>
      {isExpanded ? (
        <>
          <div className="mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Foreman notes</p>
              <p className="mt-2 leading-6 text-slate-700">
                {blocker?.foremanNotes || "No notes entered."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Timing</p>
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
          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
            <input
              className="size-4 rounded border-slate-300"
              defaultChecked={repairOrder.contactState?.hasRentalCar ?? false}
              name="hasRentalCar"
              type="checkbox"
            />
            Rental car on RO
          </label>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Repair Value
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              defaultValue={repairOrder.repairValue ?? ""}
              name="repairValue"
            >
              <option value="">Not set</option>
              {repairValueOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Customer notes
            </span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              name="customerNotes"
              onChange={(event) => setNotesValue(event.target.value)}
              placeholder="What was communicated to the customer?"
              value={notesValue}
            />
            <span className="mt-2 block text-xs text-slate-500">
              Saving a note marks the customer as contacted and adds a timestamp.
            </span>
          </label>
          <div className="mt-4">
            <GoToCallFeedback roNumber={repairOrder.roNumber} />
          </div>
          <div className="mt-4">
            <ContactHistoryList entries={repairOrder.contactRecords} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              disabled={pending}
              type="submit"
            >
              {pending ? "Saving..." : "Save Contact Update"}
            </button>
            {callHref ? (
              <a
                className="rounded-full border border-cyan-300 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-900 transition hover:border-cyan-400 hover:bg-cyan-100"
                href={callHref}
              >
                Call Customer
              </a>
            ) : (
              <span className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-400">
                No Phone
              </span>
            )}
            {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
          </div>
        </>
      ) : (
        <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-600">
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
      )}
    </form>
  );
}
