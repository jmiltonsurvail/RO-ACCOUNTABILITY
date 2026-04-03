"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateContactAction, type ActionState } from "@/app/advisor/actions";
import { formatPhoneHref } from "@/lib/utils";

const initialState: ActionState = {};

export function InlineContactEditor({
  contacted,
  customerNotes,
  phone,
  roNumber,
}: {
  contacted: boolean;
  customerNotes: string | null;
  phone: string | null;
  roNumber: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateContactAction, initialState);
  const callHref = formatPhoneHref(phone);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="grid gap-3">
      <input name="roNumber" type="hidden" value={roNumber} />

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
        <input
          className="size-4 rounded border-slate-300"
          defaultChecked={contacted}
          name="contacted"
          type="checkbox"
        />
        Customer contacted
      </label>

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">
          Customer Notes
        </span>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          defaultValue={customerNotes ?? ""}
          name="customerNotes"
          placeholder="What was communicated to the customer?"
        />
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

      {state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
    </form>
  );
}
