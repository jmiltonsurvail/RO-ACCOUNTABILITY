"use client";

import { type RepairValue } from "@prisma/client";
import { InlineContactEditor } from "@/components/inline-contact-editor";
import { type ContactHistoryEntry } from "@/components/contact-history-list";
import { hasRepairOrderContactToday } from "@/lib/repair-order-urgency";

export function ContactEditModal({
  contacted,
  contactRecords,
  customerName,
  hasRentalCar,
  onClose,
  phone,
  repairValue,
  roNumber,
}: {
  contacted: boolean;
  contactRecords: ContactHistoryEntry[];
  customerName: string;
  hasRentalCar: boolean;
  onClose: () => void;
  phone: string | null;
  repairValue: RepairValue | null;
  roNumber: number;
}) {
  const contactedToday = hasRepairOrderContactToday({
    blockerState: null,
    contactRecords,
    contactState: {
      contacted,
      hasRentalCar,
    },
    promisedAtNormalized: null,
    roNumber,
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/60 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Customer Contact</p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-900">
              RO {roNumber} · {customerName}
            </h2>
          </div>
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="px-6 py-5">
          <InlineContactEditor
            contacted={contactedToday}
            contactRecords={contactRecords}
            hasRentalCar={hasRentalCar}
            onSaved={onClose}
            phone={phone}
            repairValue={repairValue}
            roNumber={roNumber}
            showHistoryAndSummary={false}
          />
        </div>
      </div>
    </div>
  );
}
