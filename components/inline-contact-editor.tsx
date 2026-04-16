"use client";

import { type RepairValue } from "@prisma/client";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { updateContactAction, type ActionState } from "@/app/advisor/actions";
import { ContactHistoryList, type ContactHistoryEntry } from "@/components/contact-history-list";
import { GoToCallFeedback } from "@/components/goto-call-feedback";
import {
  getDerivedCallStatus,
  getDerivedCallStatusClasses,
  getDerivedCallStatusLabel,
} from "@/lib/call-session-status";
import { repairValueOptions } from "@/lib/constants";

const initialState: ActionState = {};

export function InlineContactEditor({
  contacted,
  contactRecords,
  hasRentalCar,
  onSaved,
  phone,
  repairValue,
  roNumber,
  showHistoryAndSummary = true,
}: {
  contacted: boolean;
  contactRecords: ContactHistoryEntry[];
  hasRentalCar: boolean;
  onSaved?: () => void;
  phone: string | null;
  repairValue: RepairValue | null;
  roNumber: number;
  showHistoryAndSummary?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(updateContactAction, initialState);
  const [notesValue, setNotesValue] = useState("");
  const callHref = phone
    ? `/api/goto-connect/call?ro=${roNumber}&returnTo=${encodeURIComponent(pathname)}`
    : null;
  const contactedValue = notesValue.trim().length > 0 || contacted;
  const latestCallSummary =
    contactRecords.find((record) => record.linkedCallRecord?.callSummary)?.linkedCallRecord
      ?.callSummary ?? null;
  const latestCallRecord = contactRecords.find((record) => record.linkedCallRecord)?.linkedCallRecord ?? null;
  const handleSaved = useEffectEvent(() => {
    setNotesValue("");
    onSaved?.();
    router.refresh();
  });

  useEffect(() => {
    if (state.saved) {
      handleSaved();
    }
  }, [state.saved]);

  return (
    <form action={formAction} className="grid gap-3">
      <input name="roNumber" type="hidden" value={roNumber} />
      <input name="contacted" type="hidden" value={contactedValue ? "true" : "false"} />

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
        <input
          className="size-4 rounded border-slate-300"
          defaultChecked={hasRentalCar}
          name="hasRentalCar"
          type="checkbox"
        />
        Rental car on RO
      </label>

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">
          Repair Value
        </span>
        <select
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          defaultValue={repairValue ?? ""}
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

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">
          Customer Notes
        </span>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          name="customerNotes"
          onChange={(event) => setNotesValue(event.target.value)}
          placeholder="What was communicated to the customer?"
          value={notesValue}
        />
        <span className="mt-2 block text-xs text-slate-500">
          Saving a note marks the customer as contacted and adds a timestamp.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-800 transition hover:border-cyan-400 hover:text-slate-950 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : "Save Contact"}
        </button>
        {callHref ? (
          <a
            className="rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-900 transition hover:border-cyan-400 hover:bg-cyan-100"
            href={callHref}
          >
            Call Customer
          </a>
        ) : (
          <span className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            No Phone
          </span>
        )}
      </div>

      <GoToCallFeedback roNumber={roNumber} />
      {showHistoryAndSummary ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Latest Call</p>
            {latestCallRecord ? (
              <>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getDerivedCallStatusClasses(
                    getDerivedCallStatus(latestCallRecord),
                  )}`}
                >
                  {getDerivedCallStatusLabel(getDerivedCallStatus(latestCallRecord))}
                </span>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {latestCallSummary || latestCallRecord.goToAiSummary || "No call summary yet."}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-700">No call record yet.</p>
            )}
          </div>
          <ContactHistoryList entries={contactRecords} />
        </>
      ) : null}
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
    </form>
  );
}
