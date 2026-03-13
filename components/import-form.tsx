"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  importXtimeCsvAction,
  type ImportActionState,
} from "@/app/manager/import/actions";

const initialState: ImportActionState = {};

export function ImportForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    importXtimeCsvAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form
      action={formAction}
      className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-slate-700" htmlFor="csvFile">
          Daily Xtime export
        </label>
        <input
          accept=".csv"
          className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          id="csvFile"
          name="csvFile"
          required
          type="file"
        />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Importing..." : "Run Daily Import"}
        </button>
        {state.success ? (
          <p className="text-sm text-emerald-700">{state.success}</p>
        ) : null}
        {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      </div>
    </form>
  );
}
