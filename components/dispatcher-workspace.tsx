"use client";

import { type BlockerReason, type RepairValue } from "@prisma/client";
import { ActiveRoBoard } from "@/components/active-ro-board";
import { type SlaSettingsValues } from "@/lib/sla-settings";

type DispatcherOrder = {
  advisorName: string | null;
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
  repairOrders,
  slaSettings,
}: {
  repairOrders: DispatcherOrder[];
  slaSettings: SlaSettingsValues;
}) {
  return (
    <ActiveRoBoard
      actionMode="edit"
      contactMode="edit"
      repairOrders={repairOrders}
      slaSettings={slaSettings}
      subtitle=""
      title="All Active ROs"
    />
  );
}
