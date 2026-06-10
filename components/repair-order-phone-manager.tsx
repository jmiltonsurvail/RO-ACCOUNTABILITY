"use client";

import { useActionState, useEffect, useEffectEvent, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  addRepairOrderContactPhoneAction,
  type ActionState,
  updateRepairOrderPrimaryPhoneAction,
} from "@/app/advisor/actions";

const initialState: ActionState = {};

export type RepairOrderContactPhoneEntry = {
  id: string;
  label: string | null;
  phoneNumber: string;
};

export type RepairOrderPhoneOption = {
  id: string;
  isPrimary: boolean;
  label: string;
  phoneNumber: string;
};

export function buildRepairOrderPhoneOptions(input: {
  contactPhones: RepairOrderContactPhoneEntry[];
  primaryPhone: string | null;
}) {
  const seen = new Set<string>();
  const options: RepairOrderPhoneOption[] = [];

  if (input.primaryPhone?.trim()) {
    seen.add(input.primaryPhone.trim());
    options.push({
      id: "primary",
      isPrimary: true,
      label: "Primary",
      phoneNumber: input.primaryPhone.trim(),
    });
  }

  for (const phone of input.contactPhones) {
    const normalized = phone.phoneNumber.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    options.push({
      id: phone.id,
      isPrimary: false,
      label: phone.label?.trim() || "Alternate",
      phoneNumber: normalized,
    });
  }

  return options;
}

export function RepairOrderPhoneManager({
  canAddAlternate = true,
  canEditPrimary = false,
  contactPhones,
  primaryPhone,
  roNumber,
}: {
  canAddAlternate?: boolean;
  canEditPrimary?: boolean;
  contactPhones: RepairOrderContactPhoneEntry[];
  primaryPhone: string | null;
  roNumber: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [addState, addAction, addPending] = useActionState(
    addRepairOrderContactPhoneAction,
    initialState,
  );
  const [primaryState, primaryAction, primaryPending] = useActionState(
    updateRepairOrderPrimaryPhoneAction,
    initialState,
  );
  const [alternatePhone, setAlternatePhone] = useState("");
  const [alternateLabel, setAlternateLabel] = useState("");
  const phoneOptions = useMemo(
    () => buildRepairOrderPhoneOptions({ contactPhones, primaryPhone }),
    [contactPhones, primaryPhone],
  );
  const handleSaved = useEffectEvent(() => {
    setAlternatePhone("");
    setAlternateLabel("");
    router.refresh();
  });
  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.set("openRo", String(roNumber));
  const returnTo =
    returnToParams.size > 0 ? `${pathname}?${returnToParams.toString()}` : pathname;

  useEffect(() => {
    if (addState.saved) {
      handleSaved();
    }
  }, [addState.saved]);

  useEffect(() => {
    if (primaryState.saved) {
      router.refresh();
    }
  }, [primaryState.saved, router]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">RO Phone Numbers</p>
        <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-zinc-600">
          {phoneOptions.length} Number{phoneOptions.length === 1 ? "" : "s"}
        </span>
      </div>

      {canEditPrimary ? (
        <form action={primaryAction} className="mt-3 grid gap-2">
          <input name="roNumber" type="hidden" value={roNumber} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">Primary phone</span>
            <input
              className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              defaultValue={primaryPhone ?? ""}
              key={primaryPhone ?? "empty-primary-phone"}
              name="phoneNumber"
              placeholder="+15555550100"
              type="tel"
            />
          </label>
          <div className="flex justify-end">
            <button
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 disabled:opacity-50"
              disabled={primaryPending}
              type="submit"
            >
              {primaryPending ? "Saving..." : "Update Primary"}
            </button>
          </div>
          {primaryState.error ? <p className="text-xs text-rose-600">{primaryState.error}</p> : null}
          {primaryState.success ? (
            <p className="text-xs text-emerald-700">{primaryState.success}</p>
          ) : null}
        </form>
      ) : null}

      <div className="mt-3 space-y-2">
        {phoneOptions.length === 0 ? (
          <p className="text-sm text-zinc-600">No phone numbers on this RO.</p>
        ) : (
          phoneOptions.map((phone) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              key={phone.id}
            >
              <div>
                <p className="font-medium text-zinc-900">{phone.phoneNumber}</p>
                <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                  {phone.label}
                </p>
              </div>
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
                {phone.isPrimary ? "Primary" : "Alternate"}
              </span>
              <a
                className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-semibold text-zinc-800 transition hover:border-zinc-900"
                href={`/api/goto-connect/call?ro=${roNumber}&contactPhoneNumber=${encodeURIComponent(
                  phone.phoneNumber,
                )}&returnTo=${encodeURIComponent(returnTo)}`}
              >
                Call
              </a>
            </div>
          ))
        )}
      </div>

      {canAddAlternate ? (
        <form action={addAction} className="mt-3 grid gap-2">
          <input name="roNumber" type="hidden" value={roNumber} />
          <div className="grid gap-2 sm:grid-cols-[1fr_0.7fr]">
            <label className="block">
              <span className="sr-only">Alternate phone</span>
              <input
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                name="phoneNumber"
                onChange={(event) => setAlternatePhone(event.target.value)}
                placeholder="Add another number"
                type="tel"
                value={alternatePhone}
              />
            </label>
            <label className="block">
              <span className="sr-only">Phone label</span>
              <input
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                maxLength={80}
                name="label"
                onChange={(event) => setAlternateLabel(event.target.value)}
                placeholder="Label"
                value={alternateLabel}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 disabled:opacity-50"
              disabled={addPending || alternatePhone.trim().length === 0}
              type="submit"
            >
              {addPending ? "Adding..." : "Add Number"}
            </button>
          </div>
          {addState.error ? <p className="text-xs text-rose-600">{addState.error}</p> : null}
          {addState.success ? <p className="text-xs text-emerald-700">{addState.success}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
