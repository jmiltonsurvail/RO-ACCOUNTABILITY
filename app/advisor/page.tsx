import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { AdvisorRoBoard } from "@/components/advisor-ro-board";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { getAdvisorBoard } from "@/lib/data";
import { getSlaSettings } from "@/lib/sla-settings";
import {
  getRepairOrderUrgencyScore,
  isRepairOrderContactPastSla,
  isRepairOrderOverdue,
  needsRepairOrderContact,
} from "@/lib/repair-order-urgency";

export default async function AdvisorPage() {
  const session = await requireRole([Role.ADVISOR]);
  const organizationId = requireOrganizationId(session);
  const [repairOrders, slaSettings] = await Promise.all([
    getAdvisorBoard(organizationId, session.user.asmNumber ?? -1),
    getSlaSettings(organizationId),
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

  return (
    <AppShell
      currentPath="/advisor"
      session={session}
      subtitle=""
      title="Advisor Board"
    >
      <div className="grid gap-5">
        {repairOrders.length === 0 ? (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-medium text-slate-900">No active ROs assigned.</p>
          </section>
        ) : (
          <AdvisorRoBoard repairOrders={serializedRepairOrders} slaSettings={slaSettings} />
        )}
      </div>
    </AppShell>
  );
}
