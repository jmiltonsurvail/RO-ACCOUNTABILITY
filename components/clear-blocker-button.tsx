"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearBlockerAction, type ActionState } from "@/app/dispatcher/actions";

export function ClearBlockerButton({ roNumber }: { roNumber: number }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <div>
      <button
        className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 transition hover:border-rose-400 hover:bg-rose-50 disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          const formData = new FormData();
          formData.set("roNumber", String(roNumber));

          startTransition(async () => {
            const result = await clearBlockerAction({}, formData);
            setState(result);
          });
        }}
        type="button"
      >
        {pending ? "Clearing..." : "Clear Blocker"}
      </button>
      {state.error ? <p className="mt-2 text-xs text-rose-600">{state.error}</p> : null}
    </div>
  );
}
