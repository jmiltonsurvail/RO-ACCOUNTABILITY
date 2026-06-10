"use client";

import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addRepairOrderNoteAction,
  type ActionState,
} from "@/app/advisor/actions";
import { formatDateTime } from "@/lib/utils";

const initialState: ActionState = {};

export type RepairOrderNoteEntry = {
  createdAt: string;
  id: string;
  note: string;
  userLabel: string | null;
  userRole: string | null;
};

export function RepairOrderNotes({
  canAdd = false,
  notes,
  roNumber,
}: {
  canAdd?: boolean;
  notes: RepairOrderNoteEntry[];
  roNumber: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addRepairOrderNoteAction, initialState);
  const [note, setNote] = useState("");
  const handleSaved = useEffectEvent(() => {
    setNote("");
    router.refresh();
  });

  useEffect(() => {
    if (state.saved) {
      handleSaved();
    }
  }, [state.saved]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Internal Notes</p>
        <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-zinc-600">
          {notes.length} Note{notes.length === 1 ? "" : "s"}
        </span>
      </div>

      {canAdd ? (
        <form action={formAction} className="mt-3 grid gap-2">
          <input name="roNumber" type="hidden" value={roNumber} />
          <label className="block">
            <span className="sr-only">Internal note</span>
            <textarea
              className="min-h-20 w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
              maxLength={2000}
              name="note"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add an internal RO note..."
              value={note}
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">Internal notes do not mark the customer contacted.</p>
            <button
              className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 px-3 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 disabled:opacity-50"
              disabled={pending || note.trim().length === 0}
              type="submit"
            >
              {pending ? "Saving..." : "Save Note"}
            </button>
          </div>
          {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
          {state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
        </form>
      ) : null}

      {notes.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">No internal notes yet.</p>
      ) : (
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
          {notes.map((entry) => (
            <div className="rounded-md border border-zinc-200 bg-white px-3 py-2" key={entry.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  {entry.userLabel || entry.userRole || "User"}
                </p>
                <p className="text-xs text-zinc-500">{formatDateTime(entry.createdAt)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {entry.note}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
