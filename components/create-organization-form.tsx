"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createOrganizationAction,
  type CreateOrganizationActionState,
} from "@/app/servicesyncnow-admin/actions";

const initialState: CreateOrganizationActionState = {};

export function CreateOrganizationForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createOrganizationAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Organization Name</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            name="organizationName"
            placeholder="Service Drive Honda"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Organization Slug</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            name="organizationSlug"
            placeholder="service-drive-honda"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            First Manager Name
          </span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            name="firstUserName"
            placeholder="Jane Smith"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            First Manager Email
          </span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            name="firstUserEmail"
            placeholder="jane@servicesyncnow.com"
            required
            type="email"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Temporary Password
        </span>
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
          minLength={8}
          name="firstUserPassword"
          placeholder="At least 8 characters"
          required
          type="password"
        />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Creating..." : "Create Organization"}
        </button>
        {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
        {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      </div>
    </form>
  );
}
