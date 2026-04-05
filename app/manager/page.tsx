import { Role } from "@prisma/client";
import { ActiveRoBoard } from "@/components/active-ro-board";
import { AppShell } from "@/components/app-shell";
import { getServerAuthSession, requireRole } from "@/lib/auth";
import { getActiveRepairOrders } from "@/lib/data";
export default async function ManagerPage() {
  await requireRole([Role.MANAGER]);
  const session = await getServerAuthSession();
  const activeRepairOrders = await getActiveRepairOrders();

  return (
    <AppShell
      currentPath="/manager"
      session={session!}
      subtitle="Filter all active repair orders by urgency, ASM, tech, contact status, and due timing."
      title="Manager Dashboard"
    >
      <div>
        <ActiveRoBoard
          contactMode="edit"
          repairOrders={activeRepairOrders.map((repairOrder) => ({
            advisorName: repairOrder.advisorName,
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
            repairValue: repairOrder.repairValue,
            roNumber: repairOrder.roNumber,
            tag: repairOrder.tag,
            techName: repairOrder.techName,
            techNumber: repairOrder.techNumber,
            year: repairOrder.year,
          }))}
          subtitle=""
          title="All Active ROs"
        />
      </div>
    </AppShell>
  );
}
