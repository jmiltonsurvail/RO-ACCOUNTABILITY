"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type PlatformIntegrationSettingsActionState,
  updatePlatformIntegrationSettingsAction,
} from "@/app/servicesyncnow-admin/integrations/actions";
import type { PlatformIntegrationSettingsValues } from "@/lib/platform-integrations";

const initialState: PlatformIntegrationSettingsActionState = {};

export function PlatformIntegrationsForm({
  settings,
}: {
  settings: PlatformIntegrationSettingsValues;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updatePlatformIntegrationSettingsAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="grid gap-5">
      <section className="ro-card rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-zinc-900">AWS Provisioning</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">
              Provisioning Access Key ID
            </span>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
              defaultValue={settings.awsProvisioningAccessKeyId ?? ""}
              name="awsProvisioningAccessKeyId"
              placeholder="AWS access key id with bucket and IAM provisioning access"
              type="text"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">
              Provisioning Secret Access Key
            </span>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
              name="awsProvisioningSecretAccessKey"
              placeholder={
                settings.awsProvisioningSecretAccessKey
                  ? "Stored. Enter a new value to replace it."
                  : "AWS secret access key"
              }
              type="password"
            />
          </label>
        </div>
      </section>

      <section className="ro-card rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-zinc-900">Amazon S3</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">AWS Region</span>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
              defaultValue={settings.awsRegion ?? ""}
              name="awsRegion"
              placeholder="us-east-2"
              type="text"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">S3 Bucket</span>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
              defaultValue={settings.s3Bucket ?? ""}
              name="s3Bucket"
              placeholder="servicesyncnow-call-recordings"
              type="text"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">
              Raw Recordings Prefix
            </span>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
              defaultValue={settings.s3RawRecordingsPrefix ?? ""}
              name="s3RawRecordingsPrefix"
              placeholder="raw/goto"
              type="text"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">
              Processed Calls Prefix
            </span>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
              defaultValue={settings.s3ProcessedCallsPrefix ?? ""}
              name="s3ProcessedCallsPrefix"
              placeholder="tenant"
              type="text"
            />
          </label>
        </div>
      </section>

      <section className="ro-card rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-zinc-900">OpenAI</h2>
        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">API Key</span>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
              name="openAiApiKey"
              placeholder={
                settings.openAiApiKey
                  ? "Stored. Enter a new value to replace it."
                  : "OpenAI API key"
              }
              type="password"
            />
          </label>

          <label className="block md:max-w-md">
            <span className="mb-2 block text-sm font-medium text-zinc-700">
              Transcription Model
            </span>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-900"
              defaultValue={settings.openAiTranscriptionModel ?? ""}
              name="openAiTranscriptionModel"
              placeholder="gpt-4o-mini-transcribe"
              type="text"
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : "Save Platform Integrations"}
        </button>
        {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
        {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      </div>
    </form>
  );
}
