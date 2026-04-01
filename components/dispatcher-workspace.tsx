"use client";

import { type BlockerReason } from "@prisma/client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveBlockerAction, type ActionState } from "@/app/dispatcher/actions";
import { ActiveRoBoard } from "@/components/active-ro-board";
import { ClearBlockerButton } from "@/components/clear-blocker-button";
import { blockerReasonOptions } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

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
  year: number;
};

const initialState: ActionState = {};

export function DispatcherWorkspace({
  repairOrders,
}: {
  repairOrders: DispatcherOrder[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveBlockerAction, initialState);
  const [roInput, setRoInput] = useState("");

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  const selectedRepairOrder = useMemo(
    () => repairOrders.find((repairOrder) => String(repairOrder.roNumber) === roInput.trim()),
    [repairOrders, roInput],
  );

  return (
    <div className="grid gap-6">
      <form
        action={formAction}
        id="dispatcher-blocker-form"
        className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">RO Number</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500"
              list="dispatcher-ros"
              name="roNumber"
              onChange={(event) => setRoInput(event.target.value)}
              placeholder="6155318"
              required
              value={roInput}
            />
            <datalist id="dispatcher-ros">
              {repairOrders.map((repairOrder) => (
                <option key={repairOrder.roNumber} value={repairOrder.roNumber.toString()}>
                  {repairOrder.customerName}
                </option>
              ))}
            </datalist>
          </label>

          {selectedRepairOrder ? (
            <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">
                {selectedRepairOrder.customerName} · {selectedRepairOrder.year}{" "}
                {selectedRepairOrder.model}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <p>ASM {selectedRepairOrder.asmNumber}</p>
                <p>Mode: {selectedRepairOrder.mode}</p>
                <p>Phone: {selectedRepairOrder.phone || "N/A"}</p>
                <p>Promised: {selectedRepairOrder.promisedRaw}</p>
                <p>
                  Normalized due: {formatDateTime(selectedRepairOrder.promisedAtNormalized)}
                </p>
                <p>
                  Contacted: {selectedRepairOrder.contactState?.contacted ? "Yes" : "No"}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">
                RO not found in the active import.
              </p>
              <p className="mt-1 text-slate-600">
                Fill the fallback fields below to create a manual RO stub before saving the blocker.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  name="fallbackAsmNumber"
                  placeholder="ASM Number"
                  type="number"
                />
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  name="fallbackYear"
                  placeholder="Year"
                  type="number"
                />
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 sm:col-span-2"
                  name="fallbackCustomerName"
                  placeholder="Customer name"
                />
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 sm:col-span-2"
                  name="fallbackModel"
                  placeholder="Vehicle model"
                />
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Blocker reason
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              key={`reason-${selectedRepairOrder?.roNumber ?? "new"}`}
              defaultValue={selectedRepairOrder?.blockerState?.blockerReason ?? ""}
              name="blockerReason"
              required
            >
              <option disabled value="">
                Select blocker reason
              </option>
              {blockerReasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Foreman notes
            </span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              key={`notes-${selectedRepairOrder?.roNumber ?? "new"}`}
              defaultValue={selectedRepairOrder?.blockerState?.foremanNotes ?? ""}
              name="foremanNotes"
              placeholder="Describe the blocker and latest tech notes."
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Tech promised date override
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              key={`date-${selectedRepairOrder?.roNumber ?? "new"}`}
              defaultValue={
                selectedRepairOrder?.blockerState?.techPromisedDate?.slice(0, 10) ?? ""
              }
              name="techPromisedDate"
              type="date"
            />
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <button
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              disabled={pending}
              type="submit"
            >
              {pending ? "Saving..." : "Save Blocker"}
            </button>
            {selectedRepairOrder?.blockerState?.isBlocked ? (
              <ClearBlockerButton roNumber={selectedRepairOrder.roNumber} />
            ) : null}
            {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
            {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
          </div>
        </div>
      </form>

      <ActiveRoBoard
        onSelectRo={(selectedRoNumber) => {
          setRoInput(String(selectedRoNumber));
          document
            .getElementById("dispatcher-blocker-form")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        repairOrders={repairOrders}
        subtitle="Filter the live RO set by ASM, blocker status, contact readiness, and due timing before loading the job into the blocker form."
        title="All Active ROs"
      />
    </div>
  );
}
