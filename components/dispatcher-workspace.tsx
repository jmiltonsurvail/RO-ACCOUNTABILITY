"use client";

import { type BlockerReason, type RepairValue } from "@prisma/client";
import { ActiveRoBoard } from "@/components/active-ro-board";
import { type ContactHistoryEntry } from "@/components/contact-history-list";
import { type RepairOrderNoteEntry } from "@/components/repair-order-notes";
import { type RepairOrderContactPhoneEntry } from "@/components/repair-order-phone-manager";
import { type SlaSettingsValues } from "@/lib/sla-settings";

type DispatcherOrder = {
  advisorName: string | null;
  advisorNotes: RepairOrderNoteEntry[];
  asmNumber: number;
  blockerState: {
    blockerReason: BlockerReason;
    blockerStartedAt: string;
    foremanNotes: string | null;
    isBlocked: boolean;
    techPromisedDate: string | null;
  } | null;
  contactState: {
    contacted: boolean;
    hasRentalCar: boolean;
    customerNotes: string | null;
  } | null;
  callSessions: Array<{
    callAnsweredAt: string | null;
    callDirection: string | null;
    callEndedAt: string | null;
    callSessionId: string;
    callSummary: string | null;
    callState: string | null;
    callerOutcome: string | null;
    durationSeconds: number | null;
    goToAiSummary: string | null;
    goToPrimaryRecordingId: string | null;
    requestedAt: string;
    transcriptStatus: "FAILED" | "PENDING" | "PROCESSING" | "READY";
    wasConnected: boolean | null;
  }>;
  contactRecords: ContactHistoryEntry[];
  contactPhones: RepairOrderContactPhoneEntry[];
  customerName: string;
  mode: string;
  model: string;
  phone: string | null;
  promisedAtNormalized: string | null;
  promisedRaw: string;
  repairValue: RepairValue | null;
  roNumber: number;
  tag: string | null;
  techName: string | null;
  techNumber: number | null;
  year: number;
};

export function DispatcherWorkspace({
  autoRefreshMs = null,
  repairOrders,
  slaSettings,
}: {
  autoRefreshMs?: number | null;
  repairOrders: DispatcherOrder[];
  slaSettings: SlaSettingsValues;
}) {
  return (
    <ActiveRoBoard
      actionMode="edit"
      autoRefreshMs={autoRefreshMs}
      contactMode="edit"
      repairOrders={repairOrders}
      slaSettings={slaSettings}
      subtitle=""
      title="All Active ROs"
    />
  );
}
