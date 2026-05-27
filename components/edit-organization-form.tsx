"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type UpdateOrganizationActionState,
  updateOrganizationAction,
} from "@/app/servicesyncnow-admin/actions";

const initialState: UpdateOrganizationActionState = {};

export function EditOrganizationForm({
  organizationId,
  organizationName,
  organizationSlug,
}: {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateOrganizationAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <details className="mt-4 rounded-md border border-zinc-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-900">
        Edit Organization
      </summary>
      <form action={formAction} className="grid gap-4 border-t border-zinc-200 p-4">
        <input name="organizationId" type="hidden" value={organizationId} />

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-700">Organization Name</span>
          <input
            className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
            defaultValue={organizationName}
            name="organizationName"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-700">Organization Slug</span>
          <input
            className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
            defaultValue={organizationSlug}
            name="organizationSlug"
            required
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <button
            className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            {pending ? "Saving..." : "Save Organization"}
          </button>
          {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
          {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
        </div>
      </form>
    </details>
  );
}
