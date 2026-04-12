import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { SlaSettingsForm } from "@/components/sla-settings-form";
import { getManagerAlertCount } from "@/lib/alerts";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { getSlaSettings } from "@/lib/sla-settings";

export default async function ManagerSlaSettingsPage() {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const [managerAlertCount, settings] = await Promise.all([
    getManagerAlertCount(organizationId),
    getSlaSettings(organizationId),
  ]);

  return (
    <AppShell
      currentPath="/manager/settings"
      managerAlertCount={managerAlertCount}
      session={session}
      subtitle=""
      title="SLA Settings"
    >
      <section className="grid gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">RO Timing Thresholds</h2>
          </div>
          <Link
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            href="/manager/settings"
          >
            Back to Settings
          </Link>
        </div>

        <SlaSettingsForm settings={settings} />
      </section>
    </AppShell>
  );
}
