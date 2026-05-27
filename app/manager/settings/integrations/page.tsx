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
      <section className="grid gap-5">
        <div className="flex justify-end">
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:border-zinc-900 hover:bg-zinc-50"
            href="/manager/settings"
          >
            Back to Settings
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {integrationCards.map((card) =>
            "href" in card ? (
              <Link
                className="ro-card rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-300"
                href={card.href}
                key={card.label}
              >
                <h3 className="text-xl font-semibold text-zinc-900">{card.label}</h3>
                <span className="mt-5 inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  {card.status}
                </span>
              </Link>
            ) : (
              <section
                className="ro-card rounded-lg border border-zinc-200 bg-white p-5"
                key={card.label}
              >
                <h3 className="text-xl font-semibold text-zinc-900">{card.label}</h3>
                <span className="mt-5 inline-flex rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-600">
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
