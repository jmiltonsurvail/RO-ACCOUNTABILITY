"use client";

import { type AlertTrigger } from "@prisma/client";
import { useActionState } from "react";
import {
  updateAlertRuleAction,
  type AlertRuleActionState,
} from "@/app/manager/settings/alerts/actions";
import { alertTriggerDescriptions } from "@/lib/constants";

const initialState: AlertRuleActionState = {};

type AlertRuleRow = {
  enabled: boolean;
  id: string;
  name: string;
  trigger: AlertTrigger;
};

function AlertRuleForm({ rule }: { rule: AlertRuleRow }) {
  const [state, formAction, pending] = useActionState(updateAlertRuleAction, initialState);

  return (
    <form
      action={formAction}
      className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
    >
      <input name="ruleId" type="hidden" value={rule.id} />
      <input name="trigger" type="hidden" value={rule.trigger} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Alert Name
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              defaultValue={rule.name}
              name="name"
            />
          </label>
          <p className="mt-3 text-sm text-slate-600">{alertTriggerDescriptions[rule.trigger]}</p>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
          <input
            className="size-4 rounded border-slate-300"
            defaultChecked={rule.enabled}
            name="enabled"
            type="checkbox"
          />
          Enabled
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : "Save Rule"}
        </button>
        {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
        {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      </div>
    </form>
  );
}

export function AlertRulesList({
  rules,
}: {
  rules: AlertRuleRow[];
}) {
  return (
    <div className="grid gap-4">
      {rules.map((rule) => (
        <AlertRuleForm key={rule.id} rule={rule} />
      ))}
    </div>
  );
}
