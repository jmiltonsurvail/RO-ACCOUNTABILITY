import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { AdvisorContactCard } from "@/components/advisor-contact-card";
import { requireRole } from "@/lib/auth";
import { getAdvisorBoard } from "@/lib/data";
import { getSlaSettings } from "@/lib/sla-settings";
import {
  getRepairOrderUrgencyScore,
  isRepairOrderAtRisk,
  isRepairOrderContactPastSla,
  isRepairOrderOverdue,
  needsRepairOrderContact,
} from "@/lib/repair-order-urgency";

export default async function AdvisorPage() {
  const session = await requireRole([Role.ADVISOR]);
  const [repairOrders, slaSettings] = await Promise.all([
    getAdvisorBoard(session.user.asmNumber ?? -1),
    getSlaSettings(),
  ]);
  const serializedRepairOrders = repairOrders.map((repairOrder) => {
    const priorityScore = getRepairOrderUrgencyScore(repairOrder, slaSettings);
    const riskReason = isRepairOrderOverdue(repairOrder)
      ? "Overdue promise"
      : isRepairOrderContactPastSla(repairOrder, slaSettings)
        ? "Contact SLA breached"
        : needsRepairOrderContact(repairOrder)
          ? "Customer outreach needed"
        : repairOrder.contactState?.hasRentalCar
          ? "Rental car exposure"
          : repairOrder.repairValue === "HIGH"
            ? "High repair value"
            : "Aging blocked work";

    return {
      advisorName: repairOrder.advisorName,
      asmNumber: repairOrder.asmNumber,
      blockerState: repairOrder.blockerState
        ? {
            blockerReason: repairOrder.blockerState.blockerReason,
            blockerStartedAt: repairOrder.blockerState.blockerStartedAt.toISOString(),
            foremanNotes: repairOrder.blockerState.foremanNotes,
            techPromisedDate: repairOrder.blockerState.techPromisedDate?.toISOString() ?? null,
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
      priorityScore,
      promisedAtNormalized: repairOrder.promisedAtNormalized?.toISOString() ?? null,
      repairValue: repairOrder.repairValue,
      riskReason,
      roNumber: repairOrder.roNumber,
      tag: repairOrder.tag,
      techName: repairOrder.techName,
      techNumber: repairOrder.techNumber,
      year: repairOrder.year,
    };
  });
  const atRiskRepairOrders = serializedRepairOrders.filter((repairOrder) =>
    isRepairOrderAtRisk(repairOrder, slaSettings),
  );
  const remainingRepairOrders = serializedRepairOrders.filter(
    (repairOrder) => !isRepairOrderAtRisk(repairOrder, slaSettings),
  );

  return (
    <AppShell
      currentPath="/advisor"
      session={session}
      subtitle="Only your blocked repair orders appear here. Update customer-contact status and notes so the manager board reflects real accountability."
      title="Advisor Board"
    >
      <div className="grid gap-5">
        {repairOrders.length === 0 ? (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-medium text-slate-900">No blocked ROs assigned.</p>
            <p className="mt-2 text-sm text-slate-500">
              When the dispatcher flags a blocker on one of your ROs, it will appear here.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-3">
                <div className="rounded-[1.25rem] bg-slate-950 px-5 py-4 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] opacity-70">At Risk Now</p>
                  <p className="mt-2 text-3xl font-semibold">{atRiskRepairOrders.length}</p>
                </div>
                <div className="rounded-[1.25rem] bg-amber-100 px-5 py-4 text-amber-900">
                  <p className="text-xs uppercase tracking-[0.2em] opacity-70">Need Contact</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {
                      serializedRepairOrders.filter((repairOrder) =>
                        needsRepairOrderContact(repairOrder),
                      ).length
                    }
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-rose-100 px-5 py-4 text-rose-800">
                  <p className="text-xs uppercase tracking-[0.2em] opacity-70">Overdue</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {
                      serializedRepairOrders.filter((repairOrder) =>
                        isRepairOrderOverdue(repairOrder),
                      ).length
                    }
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-cyan-100 px-5 py-4 text-cyan-900">
                  <p className="text-xs uppercase tracking-[0.2em] opacity-70">
                    Total Blocked
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{serializedRepairOrders.length}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Start with the at-risk cards first. They are ranked by overdue promise,
                missing contact, rental-car exposure, repair value, and blocker age.
              </p>
            </section>

            <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">At Risk Now</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    These jobs need attention first because they are overdue, uncontacted,
                    rental-car related, high value, or aging.
                  </p>
                </div>
                <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                  {atRiskRepairOrders.length} cards
                </div>
              </div>
              <div className="mt-5 grid gap-5">
                {atRiskRepairOrders.map((repairOrder) => (
                  <AdvisorContactCard key={repairOrder.roNumber} repairOrder={repairOrder} />
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Everything Else</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    The remaining blocked work is still available here once the urgent queue is
                    handled.
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                  {remainingRepairOrders.length} cards
                </div>
              </div>
              {remainingRepairOrders.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
                  Everything on your board is already in the at-risk queue.
                </div>
              ) : (
                <div className="mt-5 grid gap-5">
                  {remainingRepairOrders.map((repairOrder) => (
                    <AdvisorContactCard key={repairOrder.roNumber} repairOrder={repairOrder} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
