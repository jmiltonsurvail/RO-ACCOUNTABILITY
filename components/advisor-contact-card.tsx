"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateContactAction, type ActionState } from "@/app/advisor/actions";
import { blockerReasonLabels } from "@/lib/constants";
import { formatDateTime, formatPhoneHref, hoursSince } from "@/lib/utils";

const initialState: ActionState = {};

type AdvisorRepairOrder = {
  blockerState: {
    blockerReason: keyof typeof blockerReasonLabels;
    blockerStartedAt: string;
    foremanNotes: string | null;
    techPromisedDate: string | null;
  } | null;
  contactState: {
    contacted: boolean;
    hasRentalCar: boolean;
    customerNotes: string | null;
  } | null;
  customerName: string;
  model: string;
  phone: string | null;
  promisedAtNormalized: string | null;
  roNumber: number;
  tag: string | null;
  year: number;
};

export function AdvisorContactCard({
  repairOrder,
}: {
  repairOrder: AdvisorRepairOrder;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateContactAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  const blocker = repairOrder.blockerState;
  const blockerLabel = blocker
    ? blockerReasonLabels[blocker.blockerReason]
    : "No blocker";
  const callHref = formatPhoneHref(repairOrder.phone);

  return (
    <form
      action={formAction}
      className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <input name="roNumber" type="hidden" value={repairOrder.roNumber} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            RO {repairOrder.roNumber}
          </p>
        <span className="mt-2 inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            Tag {repairOrder.tag || "N/A"}
          </span>
          {repairOrder.contactState?.hasRentalCar ? (
            <span className="mt-2 ml-2 inline-flex size-8 animate-pulse items-center justify-center rounded-lg border border-rose-700 bg-rose-600 text-xs font-bold uppercase tracking-[0.18em] text-white">
              RC
            </span>
          ) : null}
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {repairOrder.customerName}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {repairOrder.year} {repairOrder.model}
          </p>
        </div>
        <div className="rounded-3xl bg-slate-950 px-4 py-2 text-sm text-white">
          {blockerLabel}
        </div>
      </div>
      <div className="mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Foreman notes</p>
          <p className="mt-2 leading-6 text-slate-700">
            {blocker?.foremanNotes || "No notes entered."}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Timing</p>
          <p className="mt-2">
            Blocked for {blocker ? hoursSince(blocker.blockerStartedAt) : 0} hours
          </p>
          <p className="mt-1">
            Due:{" "}
            {formatDateTime(
              blocker?.techPromisedDate ?? repairOrder.promisedAtNormalized,
            )}
          </p>
          <p className="mt-1">Phone: {repairOrder.phone || "N/A"}</p>
        </div>
      </div>
      <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
        <input
          className="size-4 rounded border-slate-300"
          defaultChecked={repairOrder.contactState?.contacted ?? false}
          name="contacted"
          type="checkbox"
        />
        Customer contacted
      </label>
      <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
        <input
          className="size-4 rounded border-slate-300"
          defaultChecked={repairOrder.contactState?.hasRentalCar ?? false}
          name="hasRentalCar"
          type="checkbox"
        />
        Rental car on RO
      </label>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Customer notes
        </span>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
          defaultValue={repairOrder.contactState?.customerNotes ?? ""}
          name="customerNotes"
          placeholder="What was communicated to the customer?"
        />
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : "Save Contact Update"}
        </button>
        {callHref ? (
          <a
            className="rounded-full border border-cyan-300 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-900 transition hover:border-cyan-400 hover:bg-cyan-100"
            href={callHref}
          >
            Call Customer
          </a>
        ) : (
          <span className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-400">
            No Phone
          </span>
        )}
        {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
        {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      </div>
    </form>
  );
}
