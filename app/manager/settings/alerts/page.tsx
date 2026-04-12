import Link from "next/link";
import { Role } from "@prisma/client";
import { AlertRulesList } from "@/components/alert-rules-list";
import { AppShell } from "@/components/app-shell";
import { CompactStatCard } from "@/components/compact-stat-card";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { getManagerAlertsData } from "@/lib/alerts";

export default async function ManagerAlertSettingsPage() {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const alertData = await getManagerAlertsData(organizationId);

  return (
    <AppShell
      currentPath="/manager/settings"
      managerAlertCount={alertData.alertCount}
      session={session}
      subtitle=""
      title="Alert Settings"
    >
      <section className="grid gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Manager Alerts</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              href="/manager/alerts"
            >
              Open Alerts
            </Link>
            <Link
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              href="/manager/settings"
            >
              Back to Settings
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {alertData.summaryCards.map((card) => (
            <CompactStatCard key={card.label} label={card.label} tone={card.tone} value={card.count} />
          ))}
        </div>

        <AlertRulesList rules={alertData.rules} />
      </section>
    </AppShell>
  );
}
