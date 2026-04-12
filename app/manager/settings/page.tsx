import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { getManagerAlertCount } from "@/lib/alerts";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { getSlaSettings } from "@/lib/sla-settings";

export default async function ManagerSettingsPage() {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const [managerAlertCount, slaSettings] = await Promise.all([
    getManagerAlertCount(organizationId),
    getSlaSettings(organizationId),
  ]);
  const settingsCards = [
    {
      description: "",
      href: "/manager/users",
      label: "Users",
      meta: "Access and roster management",
    },
    {
      description: "",
      href: "/manager/settings/alerts",
      label: "Alerts",
      meta: `${managerAlertCount} active right now`,
    },
    {
      description: "",
      href: "/manager/settings/integrations",
      label: "Integrations",
      meta: "Email, SMS, webhooks, and third-party connections",
    },
    {
      description: "",
      href: "/manager/settings/sla",
      label: "SLA",
      meta: `${slaSettings.blockedAgingHours}h aging · ${slaSettings.contactSlaHours}h contact · ${slaSettings.dueSoonHours}h due soon`,
    },
  ];

  return (
    <AppShell
      currentPath="/manager/settings"
      managerAlertCount={managerAlertCount}
      session={session}
      subtitle=""
      title="Settings"
    >
      <section className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
        {settingsCards.map((card) => (
          <Link
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
            href={card.href}
            key={card.href}
          >
            <h2 className="text-2xl font-semibold text-slate-950">{card.label}</h2>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {card.meta}
            </p>
            <p className="mt-5 text-sm font-semibold text-slate-900">Open</p>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
