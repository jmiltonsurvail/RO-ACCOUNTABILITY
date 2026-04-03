import { Role } from "@prisma/client";
import { ActiveRoBoard } from "@/components/active-ro-board";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { ClearBlockerButton } from "@/components/clear-blocker-button";
import { getServerAuthSession, requireRole } from "@/lib/auth";
import { blockerReasonLabels } from "@/lib/constants";
import { getActiveRepairOrders, getManagerDashboardData } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export default async function ManagerPage() {
  await requireRole([Role.MANAGER]);
  const session = await getServerAuthSession();
  const [dashboard, activeRepairOrders] = await Promise.all([
    getManagerDashboardData(),
    getActiveRepairOrders(),
  ]);

  return (
    <AppShell
      currentPath="/manager"
      session={session!}
      subtitle="Track blocked work, overdue promises, advisor contact gaps, and recent import quality from one manager view."
      title="Manager Dashboard"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Blocked Open ROs",
            tone: "bg-slate-950 text-white",
            value: dashboard.kpis.totalBlocked,
          },
          {
            label: "Overdue",
            tone: "bg-rose-100 text-rose-800",
            value: dashboard.kpis.overdue,
          },
          {
            label: "Not Contacted",
            tone: "bg-amber-100 text-amber-800",
            value: dashboard.kpis.notContacted,
          },
          {
            label: "Avg Hours Blocked",
            tone: "bg-cyan-100 text-cyan-900",
            value: dashboard.kpis.averageBlockedHours,
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-[1.75rem] p-6 shadow-sm ${card.tone}`}
          >
            <p className="text-sm uppercase tracking-[0.2em] opacity-75">{card.label}</p>
            <p className="mt-4 text-4xl font-semibold">
              {card.value}
              {card.label === "Avg Hours Blocked" ? "h" : ""}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Blocked RO board</h2>
              <p className="mt-2 text-sm text-slate-500">
                Sorted with not-contacted work first, then overdue jobs, then longest blockers.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {dashboard.board.map((repairOrder) => {
              const blocker = repairOrder.blockerState;
              const tone = repairOrder.isOverdue
                ? "border-rose-200 bg-rose-50"
                : !repairOrder.contacted && repairOrder.hoursBlocked > 4
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50";

              return (
                <details
                  key={repairOrder.id}
                  className={`rounded-[1.5rem] border p-5 ${tone}`}
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                            RO {repairOrder.roNumber}
                          </p>
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
                            ASM {repairOrder.asmNumber}
                          </span>
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                            Tag {repairOrder.tag || "N/A"}
                          </span>
                          {repairOrder.contactState?.hasRentalCar ? (
                            <span className="inline-flex size-8 animate-pulse items-center justify-center rounded-lg border border-rose-700 bg-rose-600 text-xs font-bold uppercase tracking-[0.18em] text-white">
                              RC
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-lg font-semibold text-slate-950">
                          {repairOrder.customerName} · {repairOrder.year} {repairOrder.model}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                          <span>
                            {blocker ? blockerReasonLabels[blocker.blockerReason] : "No blocker"}
                          </span>
                          <span>{repairOrder.contacted ? "Contacted" : "Not contacted"}</span>
                          <span>{repairOrder.hoursBlocked}h blocked</span>
                          <span>
                            Due{" "}
                            {formatDateTime(
                              blocker?.techPromisedDate ?? repairOrder.promisedAtNormalized,
                            )}
                          </span>
                        </div>
                      </div>
                      <ClearBlockerButton roNumber={repairOrder.roNumber} />
                    </div>
                  </summary>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-white/60 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Foreman Notes
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {blocker?.foremanNotes || "No foreman notes entered."}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/60 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Customer Notes
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {repairOrder.contactState?.customerNotes || "No customer notes."}
                        </p>
                        <p className="mt-3 text-sm text-slate-600">
                          Tag: {repairOrder.tag || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                        Audit Trail
                      </p>
                      <ActivityTimeline activities={repairOrder.activities} />
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Advisor accountability</h2>
            <div className="mt-5 space-y-3">
              {dashboard.advisorSummary.map((summary) => (
                <div
                  key={summary.asmNumber}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">ASM {summary.asmNumber}</p>
                    <p className="text-xs text-slate-500">
                      {summary.blockedCount} blocked · {summary.notContactedCount} not contacted
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
                    {summary.notContactedCount}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Recent imports</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Review row counts and skipped rows before the board is used for the day.
                </p>
              </div>
              <a
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-400 hover:text-slate-950"
                href="/manager/import"
              >
                Open Import
              </a>
            </div>
            <div className="mt-5 space-y-4">
              {dashboard.importBatches.map((batch) => (
                <div key={batch.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">{batch.sourceFileName}</p>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {batch.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDateTime(batch.createdAt)} · imported {batch.importedRowCount} · skipped{" "}
                    {batch.skippedRowCount}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-6">
        <ActiveRoBoard
          contactMode="edit"
          repairOrders={activeRepairOrders.map((repairOrder) => ({
            asmNumber: repairOrder.asmNumber,
            blockerState: repairOrder.blockerState
              ? {
                  blockerReason: repairOrder.blockerState.blockerReason,
                  blockerStartedAt: repairOrder.blockerState.blockerStartedAt.toISOString(),
                  foremanNotes: repairOrder.blockerState.foremanNotes,
                  isBlocked: repairOrder.blockerState.isBlocked,
                  techPromisedDate:
                    repairOrder.blockerState.techPromisedDate?.toISOString() ?? null,
                }
              : null,
            contactState: repairOrder.contactState
              ? {
                  contacted: repairOrder.contactState.contacted,
                  hasRentalCar: repairOrder.contactState.hasRentalCar,
                  customerNotes: repairOrder.contactState.customerNotes,
                }
              : null,
            customerName: repairOrder.customerName,
            mode: repairOrder.mode,
            model: repairOrder.model,
            phone: repairOrder.phone,
            promisedAtNormalized: repairOrder.promisedAtNormalized?.toISOString() ?? null,
            promisedRaw: repairOrder.promisedRaw,
            roNumber: repairOrder.roNumber,
            tag: repairOrder.tag,
            techName: repairOrder.techName,
            techNumber: repairOrder.techNumber,
            year: repairOrder.year,
          }))}
          subtitle="Use the broader active-RO board to find work by ASM, blocker status, customer-contact readiness, and due timing before drilling into the blocked-only stack above."
          title="All Active ROs"
        />
      </div>
    </AppShell>
  );
}
