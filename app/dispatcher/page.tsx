import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { DispatcherWorkspace } from "@/components/dispatcher-workspace";
import { getServerAuthSession, requireOrganizationId, requireRole } from "@/lib/auth";
import { getActiveRepairOrders } from "@/lib/data";
import { getSlaSettings } from "@/lib/sla-settings";

export default async function DispatcherPage() {
  const scopedSession = await requireRole([Role.DISPATCHER, Role.MANAGER]);
  const organizationId = requireOrganizationId(scopedSession);
  const session = await getServerAuthSession();
  const [repairOrders, slaSettings] = await Promise.all([
    getActiveRepairOrders(organizationId),
    getSlaSettings(organizationId),
  ]);

  return (
    <AppShell
      currentPath="/dispatcher"
      session={session!}
      subtitle=""
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
          contactRecords: repairOrder.contactRecords.map((record) => ({
            advisorLabel:
              record.advisorUser?.name?.trim() ||
              record.advisorUser?.email ||
              repairOrder.advisorName ||
              null,
              linkedCallRecord: record.callSession
                ? {
                    callAnsweredAt:
                      record.callSession.callAnsweredAt?.toISOString() ?? null,
                    callEndedAt:
                      record.callSession.callEndedAt?.toISOString() ?? null,
                    callSessionId: record.callSession.id,
                    callSummary: record.callSession.callSummary,
                    callState: record.callSession.callState,
                    callerOutcome: record.callSession.callerOutcome,
                    durationSeconds: record.callSession.durationSeconds,
                    goToAiSummary: record.callSession.goToAiSummary,
                    goToPrimaryRecordingId: record.callSession.goToPrimaryRecordingId,
                    transcriptStatus: record.callSession.transcriptStatus,
                    wasConnected: record.callSession.wasConnected,
                  }
                : null,
            contactedAt: record.contactedAt.toISOString(),
            customerNotes: record.customerNotes,
          })),
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
