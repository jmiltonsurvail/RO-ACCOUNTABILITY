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
      <section className="grid gap-5">
        <div className="ro-card flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-5">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Manager Alerts</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
              href="/manager/alerts"
            >
              Open Alerts
            </Link>
            <Link
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
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
