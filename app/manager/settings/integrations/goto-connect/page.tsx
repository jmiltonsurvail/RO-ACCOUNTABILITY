import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { GoToConnectSettingsForm } from "@/components/goto-connect-settings-form";
import {
  reResolveGoToConnectAdvisorExtensionsAction,
  syncGoToCallTrackingAction,
  updateGoToConnectAdvisorExtensionAction,
} from "@/app/manager/settings/integrations/goto-connect/actions";
import { getManagerAlertCount } from "@/lib/alerts";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { getGoToConnectSettings } from "@/lib/goto-connect";
import { prisma } from "@/lib/prisma";

export default async function ManagerGoToConnectSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    message?: string;
    oauth?: string;
    tracking?: string;
    trackingMessage?: string;
  }>;
}) {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [managerAlertCount, settings, advisors] = await Promise.all([
    getManagerAlertCount(organizationId),
    getGoToConnectSettings(organizationId),
    prisma.user.findMany({
      where: {
        organizationId,
        role: Role.ADVISOR,
        asmNumber: {
          not: null,
        },
      },
      orderBy: [{ asmNumber: "asc" }],
      select: {
        asmNumber: true,
        email: true,
        gotoConnectExtension: true,
        gotoConnectLineId: true,
        id: true,
        name: true,
      },
    }),
  ]);

  const configuredAdvisorCount = advisors.filter((advisor) =>
    Boolean(advisor.gotoConnectLineId?.trim()),
  ).length;
  const defaultTestExtension =
    advisors.find((advisor) => advisor.gotoConnectExtension?.trim())?.gotoConnectExtension ?? "";

  return (
    <AppShell
      currentPath="/manager/settings"
      managerAlertCount={managerAlertCount}
      session={session}
      subtitle=""
      title="GoTo Connect"
    >
      <section className="grid gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">GoTo Connect</h2>
          </div>
          <Link
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            href="/manager/settings/integrations"
          >
            Back to Integrations
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Status
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {settings.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Access Token
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {settings.accessToken ? "Configured" : "Missing"}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Account Key
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {settings.accountKey ? "Resolved" : "Pending"}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Advisor Extensions
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {configuredAdvisorCount}/{advisors.length}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Call Tracking
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {settings.callEventsConfiguredAt ? "Configured" : "Pending"}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Recording Bucket
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {settings.recordingS3Bucket ? "Provisioned" : "Pending"}
            </p>
          </div>
        </div>

        <GoToConnectSettingsForm
          defaultTestExtension={defaultTestExtension}
          oauthMessage={resolvedSearchParams?.message ?? null}
          oauthStatus={resolvedSearchParams?.oauth ?? null}
          settings={settings}
        />

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-slate-950">Call Tracking</h3>
              <p className="mt-2 text-sm text-slate-600">
                Sync GoTo notification subscriptions so ServiceSyncNow can track call start, completion, and duration on each queued customer call.
              </p>
            </div>
            <form action={syncGoToCallTrackingAction}>
              <button
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                {settings.callEventsConfiguredAt ? "Recheck Call Tracking" : "Enable Call Tracking"}
              </button>
            </form>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Notification Channel
              </p>
              <p className="mt-2 break-all text-sm text-slate-900">
                {settings.notificationChannelId || "Not configured"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Report Subscription
              </p>
              <p className="mt-2 break-all text-sm text-slate-900">
                {settings.callEventsReportSubscriptionId || "Not configured"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Last Sync
              </p>
              <p className="mt-2 text-sm text-slate-900">
                {settings.callEventsConfiguredAt || "Not configured"}
              </p>
            </div>
          </div>
          {resolvedSearchParams?.trackingMessage ? (
            <p
              className={`mt-4 text-sm ${
                resolvedSearchParams.tracking === "error"
                  ? "text-rose-600"
                  : "text-emerald-700"
              }`}
            >
              {resolvedSearchParams.trackingMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-slate-950">Advisor Extension Map</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                {configuredAdvisorCount} configured
              </div>
              <form action={reResolveGoToConnectAdvisorExtensionsAction}>
                <button
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-800 transition hover:border-slate-400 hover:text-slate-950"
                  type="submit"
                >
                  Re-resolve All
                </button>
              </form>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {advisors.map((advisor) => (
              <form
                action={updateGoToConnectAdvisorExtensionAction}
                className="grid gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1.15fr)_minmax(10rem,0.8fr)_minmax(16rem,1fr)_auto]"
                key={advisor.id}
              >
                <input name="userId" type="hidden" value={advisor.id} />
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {advisor.name?.trim() || advisor.email}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    ASM {advisor.asmNumber}
                  </p>
                </div>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Extension
                  </span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                    defaultValue={advisor.gotoConnectExtension ?? ""}
                    name="gotoConnectExtension"
                    placeholder="1545"
                    type="text"
                  />
                </label>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Resolved Line ID
                  </p>
                  <p className="mt-2 break-all text-sm text-slate-900">
                    {advisor.gotoConnectLineId || "Not resolved yet"}
                  </p>
                </div>
                <div className="flex items-end">
                  <button
                    className="w-full rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:text-slate-950"
                    type="submit"
                  >
                    Save + Resolve
                  </button>
                </div>
              </form>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
