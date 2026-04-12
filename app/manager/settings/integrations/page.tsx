import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { getManagerAlertCount } from "@/lib/alerts";
import { requireOrganizationId, requireRole } from "@/lib/auth";

const integrationCards = [
  {
    description: "",
    href: "/manager/settings/integrations/goto-connect",
    label: "GoTo Connect",
    status: "Available",
  },
  {
    description: "",
    label: "Email Alerts",
    status: "Coming Soon",
  },
  {
    description: "",
    label: "SMS Alerts",
    status: "Coming Soon",
  },
  {
    description: "",
    label: "Webhooks",
    status: "Coming Soon",
  },
] as const;

export default async function ManagerIntegrationsPage() {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const managerAlertCount = await getManagerAlertCount(organizationId);

  return (
    <AppShell
      currentPath="/manager/settings"
      managerAlertCount={managerAlertCount}
      session={session}
      subtitle=""
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
          {integrationCards.map((card) =>
            "href" in card ? (
              <Link
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
                href={card.href}
                key={card.label}
              >
                <h3 className="text-2xl font-semibold text-slate-950">{card.label}</h3>
                <span className="mt-5 inline-flex rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                  {card.status}
                </span>
              </Link>
            ) : (
              <section
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
                key={card.label}
              >
                <h3 className="text-2xl font-semibold text-slate-950">{card.label}</h3>
                <span className="mt-5 inline-flex rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {card.status}
                </span>
              </section>
            ),
          )}
        </div>
      </section>
    </AppShell>
  );
}
