"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type GoToConnectConnectionTestActionState,
  type GoToConnectSettingsActionState,
  testGoToConnectSettingsAction,
  updateGoToConnectSettingsAction,
} from "@/app/manager/settings/integrations/goto-connect/actions";
import type { GoToConnectSettingsValues } from "@/lib/goto-connect";

const initialSaveState: GoToConnectSettingsActionState = {};
const initialTestState: GoToConnectConnectionTestActionState = {};

export function GoToConnectSettingsForm({
  defaultTestExtension,
  settings,
}: {
  defaultTestExtension: string;
  settings: GoToConnectSettingsValues;
}) {
  const router = useRouter();
  const [saveState, saveAction, savePending] = useActionState(
    updateGoToConnectSettingsAction,
    initialSaveState,
  );
  const [testState, testAction, testPending] = useActionState(
    testGoToConnectSettingsAction,
    initialTestState,
  );

  useEffect(() => {
    if (saveState.success) {
      router.refresh();
    }
  }, [router, saveState.success]);

  return (
    <form
      action={saveAction}
      className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 md:col-span-2">
          <input
            className="size-4 rounded border-slate-300"
            defaultChecked={settings.enabled}
            name="enabled"
            type="checkbox"
          />
          Enable GoTo Connect for customer calls
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Account Key</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            defaultValue={settings.accountKey ?? ""}
            name="accountKey"
            placeholder="1956177422157042821"
            type="text"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Access Token</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
            defaultValue={settings.accessToken ?? ""}
            name="accessToken"
            placeholder="Bearer token with calls.v2.initiate and voice-admin.v1.read"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Organization ID</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            defaultValue={settings.organizationId ?? ""}
            name="organizationId"
            placeholder="INTEGRATOR_ORG_ID"
            type="text"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">OAuth Client ID</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            defaultValue={settings.clientId ?? ""}
            name="clientId"
            placeholder="GoTo OAuth client id"
            type="text"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Caller ID Phone Number ID
          </span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            defaultValue={settings.phoneNumberId ?? ""}
            name="phoneNumberId"
            placeholder="Optional outbound caller ID phone number id"
            type="text"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 md:col-span-2">
          <input
            className="size-4 rounded border-slate-300"
            defaultChecked={settings.autoAnswer}
            name="autoAnswer"
            type="checkbox"
          />
          Enable auto-answer when GoTo can intercom the selected line
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            OAuth Client Secret
          </span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            name="clientSecret"
            placeholder={
              settings.clientSecret
                ? "Stored. Enter a new value to replace it."
                : "GoTo OAuth client secret"
            }
            type="password"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Test Extension
          </span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            defaultValue={defaultTestExtension}
            name="testExtension"
            placeholder="Optional extension to verify line lookup"
            type="text"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          disabled={savePending || testPending}
          type="submit"
        >
          {savePending ? "Saving..." : "Save GoTo Connect Settings"}
        </button>
        <button
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:text-slate-950 disabled:opacity-50"
          disabled={savePending || testPending}
          formAction={testAction}
          type="submit"
        >
          {testPending ? "Testing..." : "Test Connection"}
        </button>
        {saveState.success ? <p className="text-sm text-emerald-700">{saveState.success}</p> : null}
        {saveState.error ? <p className="text-sm text-rose-600">{saveState.error}</p> : null}
        {testState.success ? <p className="text-sm text-emerald-700">{testState.success}</p> : null}
        {testState.error ? <p className="text-sm text-rose-600">{testState.error}</p> : null}
      </div>
    </form>
  );
}
