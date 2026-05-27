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

      <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-800">
        <input
          className="size-4 rounded border-zinc-300"
          defaultChecked={hasRentalCar}
          name="hasRentalCar"
          type="checkbox"
        />
        Rental car on RO
      </label>

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">
          Repair Value
        </span>
        <select
          className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
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
        <span className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">
          Customer Notes
        </span>
        <textarea
          className="min-h-24 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
          name="customerNotes"
          onChange={(event) => setNotesValue(event.target.value)}
          placeholder="What was communicated to the customer?"
          value={notesValue}
        />
        <span className="mt-2 block text-xs text-zinc-500">
          Saving a note marks the customer as contacted and adds a timestamp.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 hover:text-zinc-950 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : "Save Contact"}
        </button>
        {callHref ? (
          <a
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 transition hover:border-blue-300 hover:bg-blue-100"
            href={callHref}
          >
            Call Customer
          </a>
        ) : (
          <span className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-400">
            No Phone
          </span>
        )}
      </div>

      <GoToCallFeedback roNumber={roNumber} />
      {showHistoryAndSummary ? (
        <>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
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
          <ContactHistoryList entries={contactRecords} />
        </>
      ) : null}
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
    </form>
  );
}
