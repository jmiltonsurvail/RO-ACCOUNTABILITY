import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { DispatcherWorkspace } from "@/components/dispatcher-workspace";
import { getServerAuthSession, requireRole } from "@/lib/auth";
import { getActiveRepairOrders } from "@/lib/data";
import { getSlaSettings } from "@/lib/sla-settings";

export default async function DispatcherPage() {
  await requireRole([Role.DISPATCHER, Role.MANAGER]);
  const session = await getServerAuthSession();
  const [repairOrders, slaSettings] = await Promise.all([
    getActiveRepairOrders(),
    getSlaSettings(),
  ]);

  return (
    <AppShell
      currentPath="/dispatcher"
      session={session!}
      subtitle="Search imported repair orders, set blockers, preserve blocker age, and clear blockers when the work can move again."
      title="Dispatcher Console"
    >
      <DispatcherWorkspace
        repairOrders={repairOrders.map((repairOrder) => ({
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
        slaSettings={slaSettings}
      />
    </AppShell>
  );
}
