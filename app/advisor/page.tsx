import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { AdvisorContactCard } from "@/components/advisor-contact-card";
import { requireRole } from "@/lib/auth";
import { getAdvisorBoard } from "@/lib/data";

export default async function AdvisorPage() {
  const session = await requireRole([Role.ADVISOR]);
  const repairOrders = await getAdvisorBoard(session.user.asmNumber ?? -1);

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
          repairOrders.map((repairOrder) => (
            <AdvisorContactCard
              key={repairOrder.id}
              repairOrder={{
                blockerState: repairOrder.blockerState
                  ? {
                      blockerReason: repairOrder.blockerState.blockerReason,
                      blockerStartedAt:
                        repairOrder.blockerState.blockerStartedAt.toISOString(),
                      foremanNotes: repairOrder.blockerState.foremanNotes,
                      techPromisedDate:
                        repairOrder.blockerState.techPromisedDate?.toISOString() ?? null,
                    }
                  : null,
                contactState: repairOrder.contactState
                  ? {
                      contacted: repairOrder.contactState.contacted,
                      customerNotes: repairOrder.contactState.customerNotes,
                    }
                  : null,
                customerName: repairOrder.customerName,
                model: repairOrder.model,
                phone: repairOrder.phone,
                promisedAtNormalized:
                  repairOrder.promisedAtNormalized?.toISOString() ?? null,
                roNumber: repairOrder.roNumber,
                year: repairOrder.year,
              }}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}
