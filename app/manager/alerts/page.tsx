import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { CompactStatCard } from "@/components/compact-stat-card";
import { alertTriggerLabels, repairValueLabels } from "@/lib/constants";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { getManagerAlertsData } from "@/lib/alerts";

function getAsmLabel(advisorName: string | null, asmNumber: number) {
  return advisorName ? `ASM ${asmNumber} · ${advisorName}` : `ASM ${asmNumber}`;
}

export default async function ManagerAlertsPage() {
  const session = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(session);
  const alertData = await getManagerAlertsData(organizationId);

  return (
    <AppShell
      currentPath="/manager/alerts"
      managerAlertCount={alertData.alertCount}
      session={session}
      subtitle=""
      title="Alerts"
    >
      <section className="grid gap-5">
        <div className="ro-card flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-5">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Current Alert Queue</h2>
          </div>
          <Link
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
            href="/manager/settings/alerts"
          >
            Manage Rules
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {alertData.summaryCards.map((card) => (
            <CompactStatCard key={card.label} label={card.label} tone={card.tone} value={card.count} />
          ))}
        </div>

        {alertData.items.length === 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
            <p className="text-lg font-medium text-emerald-900">No active manager alerts.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {alertData.items.map((item) => (
              <section
                className="ro-card rounded-lg border border-zinc-200 bg-white p-4"
                key={item.roNumber}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-zinc-900 px-2 py-1 font-mono text-[11px] font-semibold text-white">
                        RO {item.roNumber}
                      </span>
                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        {item.techNumber !== null
                          ? `Tech ${item.techNumber}${item.techName ? ` · ${item.techName}` : ""}`
                          : "Tech Unassigned"}
                      </span>
                      <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white">
                        Tag {item.tag || "N/A"}
                      </span>
                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        {item.mode}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs text-white">
                        {getAsmLabel(item.advisorName, item.asmNumber)}
                      </span>
                      {item.repairValue ? (
                        <span className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700">
                          Repair Value {repairValueLabels[item.repairValue]}
                        </span>
                      ) : null}
                      <span className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700">
                        Priority {item.priorityScore}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-zinc-900">{item.customerName}</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {item.year} {item.model}
                    </p>
                  </div>
                  <div className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700">
                    {item.blockedHours}h blocked
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.matchedRules.map((rule) => (
                    <span
                      className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800"
                      key={`${item.roNumber}-${rule.trigger}`}
                      title={rule.description}
                    >
                      {rule.label}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    href="/manager"
                    style={{ color: "#ffffff" }}
                  >
                    Open Dashboard
                  </Link>
                  <span className="text-sm text-zinc-500">
                    Active rule matches: {item.matchedRules.length}
                  </span>
                  {item.contactState?.hasRentalCar ? (
                    <span className="rounded-md border border-rose-700 bg-rose-600 px-2 py-1 text-xs font-bold text-white">
                      {alertTriggerLabels.RENTAL_CAR}
                    </span>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
