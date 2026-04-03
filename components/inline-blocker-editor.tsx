"use client";

import { type BlockerReason } from "@prisma/client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveBlockerAction, type ActionState } from "@/app/dispatcher/actions";
import { ClearBlockerButton } from "@/components/clear-blocker-button";
import { blockerReasonOptions } from "@/lib/constants";

const initialState: ActionState = {};

export function InlineBlockerEditor({
  blockerReason,
  foremanNotes,
  isBlocked,
  roNumber,
  techPromisedDate,
}: {
  blockerReason: BlockerReason | null;
  foremanNotes: string | null;
  isBlocked: boolean;
  roNumber: number;
  techPromisedDate: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveBlockerAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="grid gap-3">
      <input name="roNumber" type="hidden" value={roNumber} />

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">
          Blocker Reason
        </span>
        <select
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          defaultValue={blockerReason ?? ""}
          name="blockerReason"
          required
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
        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">
          Notes
        </span>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          defaultValue={foremanNotes ?? ""}
          name="foremanNotes"
          placeholder="Describe the blocker and latest tech notes."
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">
          Tech Promised Date
        </span>
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          defaultValue={techPromisedDate?.slice(0, 10) ?? ""}
          name="techPromisedDate"
          type="date"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-slate-800 disabled:opacity-50"
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
