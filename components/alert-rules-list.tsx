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
      className="ro-card rounded-lg border border-zinc-200 bg-white p-4"
    >
      <input name="ruleId" type="hidden" value={rule.id} />
      <input name="trigger" type="hidden" value={rule.trigger} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
              Alert Name
            </span>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
              defaultValue={rule.name}
              name="name"
            />
          </label>
          <p className="mt-3 text-sm text-zinc-600">{alertTriggerDescriptions[rule.trigger]}</p>
        </div>
        <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-800">
          <input
            className="size-4 rounded border-zinc-300"
            defaultChecked={rule.enabled}
            name="enabled"
            type="checkbox"
          />
          Enabled
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
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
