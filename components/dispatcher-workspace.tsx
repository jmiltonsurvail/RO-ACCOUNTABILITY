"use client";

import { type BlockerReason } from "@prisma/client";
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
    customerNotes: string | null;
  } | null;
  customerName: string;
  mode: string;
  model: string;
  phone: string | null;
  promisedAtNormalized: string | null;
  promisedRaw: string;
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
      subtitle="Filter the live RO set by ASM, tech, blocker status, contact readiness, and due timing. Expand any RO to set, update, or clear the blocker directly on that job."
      title="All Active ROs"
    />
  );
}
