"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  connectGoToOauthAction,
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
  oauthMessage,
  oauthStatus,
  settings,
}: {
  defaultTestExtension: string;
  oauthMessage?: string | null;
  oauthStatus?: string | null;
  settings: GoToConnectSettingsValues;
}) {
  const router = useRouter();
  const [saveState, saveAction, savePending] = useActionState(
    updateGoToConnectSettingsAction,
    initialSaveState,
  );
  const [connectState, connectAction, connectPending] = useActionState(
    connectGoToOauthAction,
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
      <div className="mb-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-lg font-semibold text-slate-950">Setup Flow</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Step 1
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              Save your GoTo OAuth app
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Enter the <span className="font-semibold text-slate-900">OAuth Client ID</span> and{" "}
              <span className="font-semibold text-slate-900">OAuth Client Secret</span> from the
              GoTo app you created.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Redirect URI:
            </p>
            <p className="mt-1 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900">
              https://servicesyncnow.com/api/goto-connect/oauth/callback
            </p>
            <div className="mt-3 grid gap-2 text-xs text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Grant Type:</span> Authorization
                Code
              </p>
              <p>
                <span className="font-semibold text-slate-900">Required Scopes:</span>{" "}
                <span className="font-mono text-slate-900">users.v1.lines.read</span>{" "}
                <span className="font-mono text-slate-900">calls.v2.initiate</span>{" "}
                <span className="font-mono text-slate-900">call-events.v1.events.read</span>{" "}
                <span className="font-mono text-slate-900">call-events.v1.notifications.manage</span>{" "}
                <span className="font-mono text-slate-900">cr.v1.read</span>
              </p>
              <p>
                <span className="font-semibold text-slate-900">GoTo User:</span> Use a super
                admin or admin account that can access the account users and lines.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Step 2
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              Connect the GoTo account
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Click <span className="font-semibold text-slate-900">Connect GoTo</span>. The app
              will send you through the GoTo OAuth flow, obtain the access token, and discover the
              account key automatically when possible.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Step 3
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              Test the connection
            </p>
            <p className="mt-2 text-sm text-slate-600">
              After GoTo returns you here, add a{" "}
              <span className="font-semibold text-slate-900">Test Extension</span> if you want to
              verify line lookup, then click{" "}
              <span className="font-semibold text-slate-900">Test Connection</span>.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Step 4
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              Finish the call setup
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Save the remaining options, then use the{" "}
              <span className="font-semibold text-slate-900">Advisor Extension Map</span>{" "}
              below to connect each ASM extension to a GoTo line.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 md:col-span-2">
          <input
            className="size-4 rounded border-slate-300"
            defaultChecked={settings.enabled}
            name="enabled"
            type="checkbox"
          />
          Enable GoTo Connect for customer calls
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            OAuth Client ID
          </span>
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
          <span className="mt-2 block text-xs text-slate-500">
            The app uses these credentials to exchange the GoTo authorization code for an access
            token and refresh token.
          </span>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Connection
          </p>
          <p className="mt-2 text-sm text-slate-900">
            {settings.connectedAt
              ? `Connected${settings.accountName ? ` to ${settings.accountName}` : ""}.`
              : "Not connected yet."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {settings.accountKey
              ? `Account Key: ${settings.accountKey}`
              : "Account key will be discovered after OAuth unless the token can access multiple accounts."}
          </p>
        </div>

        <label className="block">
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

        <label className="block">
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
          <span className="mt-2 block text-xs text-slate-500">
            Example: enter one advisor extension like <span className="font-semibold">1545</span>{" "}
            before you run the connection test.
          </span>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
          <input
            className="size-4 rounded border-slate-300"
            defaultChecked={settings.autoAnswer}
            name="autoAnswer"
            type="checkbox"
          />
          Enable auto-answer when GoTo can intercom the selected line
        </label>

        <details className="rounded-2xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
            Advanced
          </summary>
          <div className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Manual Account Key Override
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                defaultValue={settings.accountKey ?? ""}
                name="accountKey"
                placeholder="Only needed if one token can access multiple GoTo accounts"
                type="text"
              />
              <span className="mt-2 block text-xs text-slate-500">
                Only use this if the connection test tells you the token can access multiple GoTo
                accounts.
              </span>
            </label>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Stored Account Key
              </p>
              <p className="mt-2 break-all text-sm text-slate-900">
                {settings.accountKey || "Will be discovered from the token"}
              </p>
            </div>
          </div>
        </details>
      </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          disabled={savePending || testPending || connectPending}
          type="submit"
        >
          {savePending ? "Saving..." : "Save GoTo Settings"}
        </button>
        <button
          className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
          disabled={savePending || testPending || connectPending}
          formAction={connectAction}
          type="submit"
        >
          {connectPending ? "Connecting..." : "Connect GoTo"}
        </button>
        <button
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:text-slate-950 disabled:opacity-50"
          disabled={savePending || testPending || connectPending}
          formAction={testAction}
          type="submit"
        >
          {testPending ? "Testing..." : "Test Connection"}
        </button>
        {oauthMessage ? (
          <p
            className={`text-sm ${oauthStatus === "error" ? "text-rose-600" : oauthStatus === "warning" ? "text-amber-700" : "text-emerald-700"}`}
          >
            {oauthMessage}
          </p>
        ) : null}
        {saveState.success ? <p className="text-sm text-emerald-700">{saveState.success}</p> : null}
        {saveState.error ? <p className="text-sm text-rose-600">{saveState.error}</p> : null}
        {connectState.success ? <p className="text-sm text-emerald-700">{connectState.success}</p> : null}
        {connectState.error ? <p className="text-sm text-rose-600">{connectState.error}</p> : null}
        {testState.success ? <p className="text-sm text-emerald-700">{testState.success}</p> : null}
        {testState.error ? <p className="text-sm text-rose-600">{testState.error}</p> : null}
      </div>
    </form>
  );
}
