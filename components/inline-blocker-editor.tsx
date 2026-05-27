"use client";

import { type BlockerReason } from "@prisma/client";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { saveBlockerAction, type ActionState } from "@/app/dispatcher/actions";
import { ClearBlockerButton } from "@/components/clear-blocker-button";
import { blockerReasonOptions } from "@/lib/constants";

const initialState: ActionState = {};

export function InlineBlockerEditor({
  blockerReason,
  isBlocked,
  roNumber,
  techPromisedDate,
}: {
  blockerReason: BlockerReason | null;
  isBlocked: boolean;
  roNumber: number;
  techPromisedDate: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveBlockerAction, initialState);
  const [selectedBlockerReason, setSelectedBlockerReason] = useState(blockerReason ?? "");
  const [notesValue, setNotesValue] = useState("");
  const [promisedDateValue, setPromisedDateValue] = useState(techPromisedDate?.slice(0, 10) ?? "");
  const handleSaved = useEffectEvent(() => {
    setNotesValue("");
    router.refresh();
  });

  useEffect(() => {
    if (state.success) {
      handleSaved();
    }
  }, [state.success]);

  return (
    <form action={formAction} className="grid gap-3">
      <input name="roNumber" type="hidden" value={roNumber} />

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">
          Blocker Reason
        </span>
        <select
          className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
          onChange={(event) =>
            setSelectedBlockerReason(event.target.value as BlockerReason | "")
          }
          name="blockerReason"
          required
          value={selectedBlockerReason}
        >
          <option disabled value="">
            Select blocker reason
          </option>
          {blockerReasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">
          Add Note
        </span>
        <textarea
          className="min-h-28 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
          name="foremanNotes"
          onChange={(event) => setNotesValue(event.target.value)}
          placeholder="Add the latest blocker update. The app will append it with a timestamp."
          required
          value={notesValue}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">
          Tech Promised Date
        </span>
        <input
          className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
          name="techPromisedDate"
          onChange={(event) => setPromisedDateValue(event.target.value)}
          type="date"
          value={promisedDateValue}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : isBlocked ? "Update Blocker" : "Set Blocker"}
        </button>
        {isBlocked ? <ClearBlockerButton roNumber={roNumber} /> : null}
      </div>

      {state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
    </form>
  );
}
