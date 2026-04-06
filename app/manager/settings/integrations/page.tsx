import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { getManagerAlertCount } from "@/lib/alerts";
import { requireRole } from "@/lib/auth";

const integrationCards = [
  {
    description:
      "Send manager alerts to email once outbound delivery is enabled. This is the natural first integration for alerting.",
    label: "Email Alerts",
    status: "Coming Soon",
  },
  {
    description:
      "Connect SMS delivery for urgent RO escalation when a manager needs immediate attention.",
    label: "SMS Alerts",
    status: "Coming Soon",
  },
  {
    description:
      "Push RO alert events into another system through a webhook for downstream workflow or reporting.",
    label: "Webhooks",
    status: "Coming Soon",
  },
] as const;

export default async function ManagerIntegrationsPage() {
  const session = await requireRole([Role.MANAGER]);
  const managerAlertCount = await getManagerAlertCount();

  return (
    <AppShell
      currentPath="/manager/settings"
      managerAlertCount={managerAlertCount}
      session={session}
      subtitle="Plan and manage external delivery channels for alerts and future system connections."
      title="Integrations"
    >
      <section className="grid gap-5 p-4 sm:p-6">
        <div className="flex justify-end">
          <Link
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            href="/manager/settings"
          >
            Back to Settings
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {integrationCards.map((card) => (
            <section
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
              key={card.label}
            >
              <h3 className="text-2xl font-semibold text-slate-950">{card.label}</h3>
              <p className="mt-2 text-sm text-slate-600">{card.description}</p>
              <span className="mt-5 inline-flex rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                {card.status}
              </span>
            </section>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
