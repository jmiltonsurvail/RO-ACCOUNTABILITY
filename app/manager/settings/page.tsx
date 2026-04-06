import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { getManagerAlertCount } from "@/lib/alerts";
import { requireRole } from "@/lib/auth";
import { getSlaSettings } from "@/lib/sla-settings";

export default async function ManagerSettingsPage() {
  const session = await requireRole([Role.MANAGER]);
  const [managerAlertCount, slaSettings] = await Promise.all([
    getManagerAlertCount(),
    getSlaSettings(),
  ]);
  const settingsCards = [
    {
      description:
        "Create logins, fill in placeholder names, and manage access for advisors, techs, dispatchers, and managers.",
      href: "/manager/users",
      label: "Users",
      meta: "Access and roster management",
    },
    {
      description:
        "Enable the at-risk signals that should appear in the manager alert center and tray badge.",
      href: "/manager/settings/alerts",
      label: "Alerts",
      meta: `${managerAlertCount} active right now`,
    },
    {
      description:
        "Manage external connections for future notifications, messaging, and outbound alert delivery.",
      href: "/manager/settings/integrations",
      label: "Integrations",
      meta: "Email, SMS, webhooks, and third-party connections",
    },
    {
      description:
        "Control the timing thresholds used for blocked aging, contact escalation, and due-soon urgency.",
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
      subtitle="Open the admin tools used to manage access and supporting app configuration."
      title="Settings"
    >
      <section className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
        {settingsCards.map((card) => (
          <Link
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
            href={card.href}
            key={card.href}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Settings
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">{card.label}</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600">{card.description}</p>
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
