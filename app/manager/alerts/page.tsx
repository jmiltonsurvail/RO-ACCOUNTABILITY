import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { CompactStatCard } from "@/components/compact-stat-card";
import { alertTriggerLabels, repairValueLabels } from "@/lib/constants";
import { requireRole } from "@/lib/auth";
import { getManagerAlertsData } from "@/lib/alerts";

function getAsmLabel(advisorName: string | null, asmNumber: number) {
  return advisorName ? `ASM ${asmNumber} · ${advisorName}` : `ASM ${asmNumber}`;
}

export default async function ManagerAlertsPage() {
  const session = await requireRole([Role.MANAGER]);
  const alertData = await getManagerAlertsData();

  return (
    <AppShell
      currentPath="/manager/alerts"
      managerAlertCount={alertData.alertCount}
      session={session}
      subtitle="Review the current at-risk repair orders matched by the enabled manager alert rules."
      title="Alerts"
    >
      <section className="grid gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Manager Alerts
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Current Alert Queue</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Each card below represents an active RO matched by one or more enabled alert rules.
            </p>
          </div>
          <Link
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
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
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
            <p className="text-lg font-medium text-emerald-900">No active manager alerts.</p>
            <p className="mt-2 text-sm text-emerald-800">
              The enabled alert rules are not currently matched by any open RO.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {alertData.items.map((item) => (
              <section
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
                key={item.roNumber}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                        RO {item.roNumber}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {item.techNumber !== null
                          ? `Tech ${item.techNumber}${item.techName ? ` · ${item.techName}` : ""}`
                          : "Tech Unassigned"}
                      </span>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                        Tag {item.tag || "N/A"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {item.mode}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
                        {getAsmLabel(item.advisorName, item.asmNumber)}
                      </span>
                      {item.repairValue ? (
                        <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                          Repair Value {repairValueLabels[item.repairValue]}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                        Priority {item.priorityScore}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-slate-950">{item.customerName}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.year} {item.model}
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                    {item.blockedHours}h blocked
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.matchedRules.map((rule) => (
                    <span
                      className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-800"
                      key={`${item.roNumber}-${rule.trigger}`}
                      title={rule.description}
                    >
                      {rule.label}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    href="/manager"
                    style={{ color: "#ffffff" }}
                  >
                    Open Dashboard
                  </Link>
                  <span className="text-sm text-slate-500">
                    Active rule matches: {item.matchedRules.length}
                  </span>
                  {item.contactState?.hasRentalCar ? (
                    <span className="rounded-full border border-rose-700 bg-rose-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
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
