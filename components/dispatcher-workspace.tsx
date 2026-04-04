"use client";

import { type BlockerReason, type RepairValue } from "@prisma/client";
import { ActiveRoBoard } from "@/components/active-ro-board";

type DispatcherOrder = {
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
}: {
  repairOrders: DispatcherOrder[];
}) {
  return (
    <ActiveRoBoard
      actionMode="edit"
      contactMode="edit"
      repairOrders={repairOrders}
      subtitle=""
      title="All Active ROs"
    />
  );
}
