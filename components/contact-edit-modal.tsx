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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Customer Contact</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              RO {roNumber} · {customerName}
            </h2>
          </div>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
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
