import { formatDateTime } from "@/lib/utils";

type ContactHistoryEntry = {
  advisorLabel: string | null;
  contactedAt: string;
  customerNotes: string | null;
};

export function ContactHistoryList({
  entries,
}: {
  entries: ContactHistoryEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
        No contact timestamps logged yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Contact History
        </p>
      </div>
      <div className="max-h-56 space-y-3 overflow-y-auto px-4 py-4">
        {entries.map((entry, index) => (
          <div
            className="rounded-2xl border border-white bg-white px-4 py-3 text-sm text-slate-700"
            key={`${entry.contactedAt}-${index}`}
          >
            <p className="font-medium text-slate-950">{formatDateTime(entry.contactedAt)}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
              {entry.advisorLabel || "Advisor"}
            </p>
            {entry.customerNotes ? (
              <p className="mt-2 leading-6 text-slate-600">{entry.customerNotes}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
