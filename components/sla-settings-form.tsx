"use client";

import { useActionState } from "react";
import {
  updateSlaSettingsAction,
  type SlaSettingsActionState,
} from "@/app/manager/settings/sla/actions";
import type { SlaSettingsValues } from "@/lib/sla-settings";

const initialState: SlaSettingsActionState = {};

function MetricCard({
  helper,
  label,
  value,
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{helper}</p>
    </div>
  );
}

export function SlaSettingsForm({
  settings,
}: {
  settings: SlaSettingsValues;
}) {
  const [state, formAction, pending] = useActionState(updateSlaSettingsAction, initialState);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          helper="Blocked ROs hit the aging threshold after this many hours."
          label="Blocked Aging"
          value={`${settings.blockedAgingHours}h`}
        />
        <MetricCard
          helper="Uncontacted blocked ROs escalate after this many hours."
          label="Contact SLA"
          value={`${settings.contactSlaHours}h`}
        />
        <MetricCard
          helper="Open work gets a due-soon urgency boost inside this window."
          label="Due Soon Window"
          value={`${settings.dueSoonHours}h`}
        />
      </div>

      <form
        action={formAction}
        className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Blocked aging hours
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              defaultValue={settings.blockedAgingHours}
              min={1}
              name="blockedAgingHours"
              type="number"
            />
            <span className="mt-2 block text-xs text-slate-500">
              Used to flag aging blocked work on the advisor and active RO boards.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Contact SLA hours
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              defaultValue={settings.contactSlaHours}
              min={1}
              name="contactSlaHours"
              type="number"
            />
            <span className="mt-2 block text-xs text-slate-500">
              Defines when an uncontacted blocked RO becomes a higher-risk item.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Due soon hours
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              defaultValue={settings.dueSoonHours}
              min={1}
              name="dueSoonHours"
              type="number"
            />
            <span className="mt-2 block text-xs text-slate-500">
              The urgency model boosts work due within this many hours.
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            {pending ? "Saving..." : "Save SLA Settings"}
          </button>
          {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
          {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
        </div>
      </form>
    </div>
  );
}
