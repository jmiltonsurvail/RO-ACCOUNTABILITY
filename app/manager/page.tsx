import { Role } from "@prisma/client";
import { ActiveRoBoard } from "@/components/active-ro-board";
import { AppShell } from "@/components/app-shell";
import { getManagerAlertCount } from "@/lib/alerts";
import { getServerAuthSession, requireOrganizationId, requireRole } from "@/lib/auth";
import { getDisplayCustomerNotes, isAutomatedTextContactNote } from "@/lib/contact-notes";
import { getActiveRepairOrders } from "@/lib/data";
import { getSlaSettings } from "@/lib/sla-settings";
export default async function ManagerPage() {
  const scopedSession = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(scopedSession);
  const [session, activeRepairOrders, managerAlertCount, slaSettings] = await Promise.all([
    getServerAuthSession(),
    getActiveRepairOrders(organizationId),
    getManagerAlertCount(organizationId),
    getSlaSettings(organizationId),
  ]);

  return (
    <AppShell
      currentPath="/manager"
      managerAlertCount={managerAlertCount}
      session={session!}
      subtitle=""
      title="Manager Dashboard"
    >
      <div>
        <ActiveRoBoard
          autoRefreshMs={15000}
          canEditPrimaryPhone
          contactMode="edit"
          includeContactedTodayCard
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
                  customerNotes: getDisplayCustomerNotes(repairOrder.contactState.customerNotes),
                }
              : null,
            callSessions: repairOrder.callSessions.map((callSession) => ({
              callAnsweredAt: callSession.callAnsweredAt?.toISOString() ?? null,
              callDirection: callSession.callDirection,
              callEndedAt: callSession.callEndedAt?.toISOString() ?? null,
              callSessionId: callSession.id,
              callSummary: callSession.callSummary,
              callState: callSession.callState,
              callerOutcome: callSession.callerOutcome,
              durationSeconds: callSession.durationSeconds,
              goToAiSummary: callSession.goToAiSummary,
              goToPrimaryRecordingId: callSession.goToPrimaryRecordingId,
              missedInboundCall: callSession.missedInboundCall,
              requestedAt: callSession.requestedAt.toISOString(),
              transcriptStatus: callSession.transcriptStatus,
              wasConnected: callSession.wasConnected,
            })),
            contactRecords: repairOrder.contactRecords.map((record) => ({
              advisorLabel:
                record.advisorUser?.name?.trim() ||
                record.advisorUser?.email ||
                repairOrder.advisorName ||
                null,
              linkedTextConversation:
                isAutomatedTextContactNote(record.customerNotes)
                  ? {
                      customerName: repairOrder.customerName,
                      customerPhone: repairOrder.phone,
                      messages: repairOrder.textMessages.map((message) => ({
                        advisorLabel:
                          message.advisorUser?.name?.trim() ||
                          message.advisorUser?.email ||
                          repairOrder.advisorName ||
                          null,
                        body: message.body,
                        contactPhoneNumber: message.contactPhoneNumber,
                        deliveryStatus: message.deliveryStatus,
                        direction: message.direction,
                        id: message.id,
                        readAt: message.readAt?.toISOString() ?? null,
                        sentAt: message.sentAt.toISOString(),
                      })),
                      roNumber: repairOrder.roNumber,
                    }
                  : null,
              linkedCallRecord: record.callSession
                ? {
                    callAnsweredAt:
                      record.callSession.callAnsweredAt?.toISOString() ?? null,
                    callDirection: record.callSession.callDirection,
                    callEndedAt:
                      record.callSession.callEndedAt?.toISOString() ?? null,
                    callSessionId: record.callSession.id,
                    callSummary: record.callSession.callSummary,
                    callState: record.callSession.callState,
                    callerOutcome: record.callSession.callerOutcome,
                    durationSeconds: record.callSession.durationSeconds,
                    goToAiSummary: record.callSession.goToAiSummary,
                    goToPrimaryRecordingId: record.callSession.goToPrimaryRecordingId,
                    missedInboundCall: record.callSession.missedInboundCall,
                    transcriptStatus: record.callSession.transcriptStatus,
                    wasConnected: record.callSession.wasConnected,
                  }
                : null,
              contactedAt: record.contactedAt.toISOString(),
              customerNotes: getDisplayCustomerNotes(record.customerNotes),
            })),
            contactPhones: repairOrder.contactPhones.map((phone) => ({
              id: phone.id,
              label: phone.label,
              phoneNumber: phone.phoneNumber,
            })),
            advisorNotes: repairOrder.advisorNotes.map((entry) => ({
              createdAt: entry.createdAt.toISOString(),
              id: entry.id,
              note: entry.note,
              userLabel: entry.user?.name?.trim() || entry.user?.email || null,
              userRole: entry.user?.role ?? null,
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
          subtitle=""
          title="All Active ROs"
        />
      </div>
    </AppShell>
  );
}
