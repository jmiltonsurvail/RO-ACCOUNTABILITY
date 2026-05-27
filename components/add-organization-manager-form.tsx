"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createOrganizationManagerAction,
  type CreateOrganizationManagerActionState,
} from "@/app/servicesyncnow-admin/actions";

const initialState: CreateOrganizationManagerActionState = {};

export function AddOrganizationManagerForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createOrganizationManagerAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <details className="mt-4 rounded-md border border-zinc-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-900">
        Add Manager
      </summary>
      <form action={formAction} className="grid gap-4 border-t border-zinc-200 p-4">
        <input name="organizationId" type="hidden" value={organizationId} />

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-700">Manager Name</span>
          <input
            className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
            name="managerName"
            placeholder="Jane Smith"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-700">Manager Email</span>
          <input
            className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
            name="managerEmail"
            placeholder="jane@company.com"
            required
            type="email"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-700">
            Temporary Password
          </span>
          <input
            className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
            minLength={8}
            name="managerPassword"
            placeholder="At least 8 characters"
            required
            type="password"
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <button
            className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            {pending ? "Adding..." : "Add Manager"}
          </button>
          {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
          {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
        </div>
      </form>
    </details>
  );
}
