"use client";

import { type BlockerReason, type RepairValue } from "@prisma/client";
import { useDeferredValue, useMemo, useState } from "react";
import { ClearBlockerButton } from "@/components/clear-blocker-button";
import { CompactStatCard } from "@/components/compact-stat-card";
import { ContactHistoryList, type ContactHistoryEntry } from "@/components/contact-history-list";
import { InlineContactEditor } from "@/components/inline-contact-editor";
import { InlineBlockerEditor } from "@/components/inline-blocker-editor";
import { blockerReasonLabels, repairValueLabels } from "@/lib/constants";
import {
  compareRepairOrderUrgency,
  getRepairOrderDueDate,
  getRepairOrderUrgencyScore,
  isRepairOrderAtRisk,
  isRepairOrderDueToday,
  isRepairOrderOverdue,
  needsRepairOrderContact,
} from "@/lib/repair-order-urgency";
import { type SlaSettingsValues } from "@/lib/sla-settings";
import { cn, formatDateOnly, formatDateTime, hoursSince } from "@/lib/utils";

type ActiveRepairOrder = {
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
  contactRecords: ContactHistoryEntry[];
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

type BlockerFilter = "all" | "blocked" | "unblocked";
type ContactFilter = "all" | "needs-contact" | "contacted" | "no-record";
type DueFilter = "all" | "overdue" | "today" | "upcoming" | "missing";
type QuickView =
  | "all"
  | "urgent"
  | "blocked"
  | "overdue"
  | "needs-contact"
  | "rental-car"
  | "high-value";

function isUpcoming(date: Date | null, now: Date) {
  if (!date) {
    return false;
  }

  const tomorrow = new Date(now);
  tomorrow.setHours(23, 59, 59, 999);

  return date > tomorrow;
}

function getRepairValueBadgeClasses(value: RepairValue) {
  if (value === "HIGH") {
    return "border-rose-700 bg-rose-600 text-white";
  }

  if (value === "MEDIUM") {
    return "border-amber-600 bg-amber-500 text-slate-950";
  }

  return "border-emerald-700 bg-emerald-600 text-white";
}

function hasActiveFilters(input: {
  asmFilter: string;
  blockerFilter: BlockerFilter;
  contactFilter: ContactFilter;
  dueFilter: DueFilter;
  modeFilter: string;
  quickView: QuickView;
  search: string;
  tagFilter: string;
  techFilter: string;
}) {
  return Boolean(
    input.search.trim() ||
      input.asmFilter !== "all" ||
      input.tagFilter !== "all" ||
      input.modeFilter !== "all" ||
      input.techFilter !== "all" ||
      input.quickView !== "all" ||
      input.blockerFilter !== "all" ||
      input.contactFilter !== "all" ||
      input.dueFilter !== "all",
  );
}

function getAsmDisplayLabel(input: { advisorName: string | null; asmNumber: number }) {
  return input.advisorName ? `ASM ${input.asmNumber} · ${input.advisorName}` : `ASM ${input.asmNumber}`;
}

export function ActiveRoBoard({
  actionMode = "none",
  contactMode = "none",
  emptyMessage = "No repair orders match the current filters.",
  repairOrders,
  slaSettings,
  subtitle,
  title,
}: {
  actionMode?: "none" | "edit";
  contactMode?: "none" | "edit";
  emptyMessage?: string;
  repairOrders: ActiveRepairOrder[];
  slaSettings: SlaSettingsValues;
  subtitle: string;
  title: string;
}) {
  const [search, setSearch] = useState("");
  const [asmFilter, setAsmFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");
  const [blockerFilter, setBlockerFilter] = useState<BlockerFilter>("all");
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [quickView, setQuickView] = useState<QuickView>("all");
  const deferredSearch = useDeferredValue(search);

  const asmOptions = useMemo(
    () =>
      Array.from(
        new Map(
          repairOrders.map((repairOrder) => [
            repairOrder.asmNumber,
            {
              advisorName: repairOrder.advisorName,
              asmNumber: repairOrder.asmNumber,
            },
          ]),
        ).values(),
      ).sort((left, right) => left.asmNumber - right.asmNumber),
    [repairOrders],
  );

  const modeOptions = useMemo(
    () =>
      Array.from(new Set(repairOrders.map((repairOrder) => repairOrder.mode))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [repairOrders],
  );

  const tagOptions = useMemo(
    () =>
      Array.from(
        new Set(
          repairOrders
            .map((repairOrder) => repairOrder.tag)
            .filter((tag): tag is string => Boolean(tag)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [repairOrders],
  );

  const techOptions = useMemo(
    () =>
      Array.from(
        new Set(
          repairOrders
            .map((repairOrder) => repairOrder.techNumber)
            .filter((techNumber): techNumber is number => techNumber !== null),
        ),
      ).sort((left, right) => left - right),
    [repairOrders],
  );

  const filteredRepairOrders = useMemo(() => {
    const now = new Date();
    const searchQuery = deferredSearch.trim().toLowerCase();

    return repairOrders
      .filter((repairOrder) => {
        const dueDate = getRepairOrderDueDate(repairOrder);
        const blocked = Boolean(repairOrder.blockerState?.isBlocked);
        const contacted = repairOrder.contactState?.contacted ?? false;
        const searchIndex = [
          repairOrder.roNumber,
          repairOrder.tag ?? "",
          repairOrder.customerName,
          repairOrder.model,
          repairOrder.mode,
          repairOrder.advisorName ?? "",
          repairOrder.phone ?? "",
          repairOrder.repairValue ? repairValueLabels[repairOrder.repairValue] : "",
          repairOrder.techName ?? "",
          repairOrder.techNumber !== null
            ? `tech ${repairOrder.techNumber}`
            : "unassigned tech",
          `asm ${repairOrder.asmNumber}`,
          blocked && repairOrder.blockerState
            ? blockerReasonLabels[repairOrder.blockerState.blockerReason]
            : "",
        ]
          .join(" ")
          .toLowerCase();

        if (searchQuery && !searchIndex.includes(searchQuery)) {
          return false;
        }

        if (asmFilter !== "all" && String(repairOrder.asmNumber) !== asmFilter) {
          return false;
        }

        if (tagFilter === "untagged" && repairOrder.tag !== null) {
          return false;
        }

        if (tagFilter !== "all" && tagFilter !== "untagged" && repairOrder.tag !== tagFilter) {
          return false;
        }

        if (modeFilter !== "all" && repairOrder.mode !== modeFilter) {
          return false;
        }

        if (techFilter === "unassigned" && repairOrder.techNumber !== null) {
          return false;
        }

        if (techFilter !== "all" && techFilter !== "unassigned") {
          if (String(repairOrder.techNumber ?? "") !== techFilter) {
            return false;
          }
        }

        if (blockerFilter === "blocked" && !blocked) {
          return false;
        }

        if (blockerFilter === "unblocked" && blocked) {
          return false;
        }

        if (contactFilter === "needs-contact" && (!blocked || contacted)) {
          return false;
        }

        if (contactFilter === "contacted" && !contacted) {
          return false;
        }

        if (contactFilter === "no-record" && repairOrder.contactState !== null) {
          return false;
        }

        if (dueFilter === "overdue" && !isRepairOrderOverdue(repairOrder, now)) {
          return false;
        }

        if (dueFilter === "today" && !isRepairOrderDueToday(repairOrder, now)) {
          return false;
        }

        if (dueFilter === "upcoming" && !isUpcoming(dueDate, now)) {
          return false;
        }

        if (dueFilter === "missing" && dueDate) {
          return false;
        }

        if (quickView === "urgent" && !isRepairOrderAtRisk(repairOrder, slaSettings, now)) {
          return false;
        }

        if (quickView === "blocked" && !blocked) {
          return false;
        }

        if (quickView === "overdue" && !isRepairOrderOverdue(repairOrder, now)) {
          return false;
        }

        if (quickView === "needs-contact" && !needsRepairOrderContact(repairOrder)) {
          return false;
        }

        if (quickView === "rental-car" && !repairOrder.contactState?.hasRentalCar) {
          return false;
        }

        if (quickView === "high-value" && repairOrder.repairValue !== "HIGH") {
          return false;
        }

        return true;
      })
      .sort((left, right) => compareRepairOrderUrgency(left, right, slaSettings, now));
  }, [
    asmFilter,
    blockerFilter,
    contactFilter,
    deferredSearch,
    dueFilter,
    modeFilter,
    quickView,
    repairOrders,
    slaSettings,
    tagFilter,
    techFilter,
  ]);

  const filteredStats = useMemo(() => {
    const now = new Date();

    return filteredRepairOrders.reduce(
      (summary, repairOrder) => {
        const blocked = Boolean(repairOrder.blockerState?.isBlocked);
        const needsContact = needsRepairOrderContact(repairOrder);

        summary.visible += 1;

        if (blocked) {
          summary.blocked += 1;
        }

        if (isRepairOrderOverdue(repairOrder, now)) {
          summary.overdue += 1;
        }

        if (needsContact) {
          summary.needsContact += 1;
        }

        if (repairOrder.contactState?.hasRentalCar) {
          summary.rentalCar += 1;
        }

        if (repairOrder.repairValue === "HIGH") {
          summary.highValue += 1;
        }

        if (isRepairOrderAtRisk(repairOrder, slaSettings, now)) {
          summary.urgent += 1;
        }

        return summary;
      },
      {
        blocked: 0,
        highValue: 0,
        needsContact: 0,
        overdue: 0,
        rentalCar: 0,
        urgent: 0,
        visible: 0,
      },
    );
  }, [filteredRepairOrders, slaSettings]);

  const resetFilters = () => {
    setSearch("");
    setAsmFilter("all");
    setTagFilter("all");
    setModeFilter("all");
    setTechFilter("all");
    setBlockerFilter("all");
    setContactFilter("all");
    setDueFilter("all");
    setQuickView("all");
  };

  const filtersAreActive = hasActiveFilters({
    asmFilter,
    blockerFilter,
    contactFilter,
    dueFilter,
    modeFilter,
    quickView,
    search,
    tagFilter,
    techFilter,
  });

  const quickViewCards = [
    {
      description: "Overdue, no-contact, rental-car, and high-value work",
      label: "Needs Action",
      tone: "bg-slate-950 text-white",
      value: filteredStats.urgent,
      view: "urgent" as const,
    },
    {
      description: "All active repair orders currently blocked",
      label: "Blocked Open ROs",
      tone: "bg-amber-100 text-amber-900",
      value: filteredStats.blocked,
      view: "blocked" as const,
    },
    {
      description: "Blocked and still waiting on advisor outreach",
      label: "Needs Contact",
      tone: "bg-orange-100 text-orange-900",
      value: filteredStats.needsContact,
      view: "needs-contact" as const,
    },
    {
      description: "Past the current due promise",
      label: "Overdue",
      tone: "bg-rose-100 text-rose-800",
      value: filteredStats.overdue,
      view: "overdue" as const,
    },
    {
      description: "Open work with rental-car exposure",
      label: "Rental Car",
      tone: "bg-rose-600 text-white",
      value: filteredStats.rentalCar,
      view: "rental-car" as const,
    },
    {
      description: "High-value repair decisions",
      label: "High Value",
      tone: "bg-cyan-100 text-cyan-900",
      value: filteredStats.highValue,
      view: "high-value" as const,
    },
  ];

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="sticky top-4 z-20 rounded-[1.5rem] border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="grid gap-4 xl:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)_auto] xl:items-start">
          <label className="block">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="RO, tag, customer, model, phone, tech, blocker"
              value={search}
            />
          </label>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
            Showing {filteredRepairOrders.length} of {repairOrders.length}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {quickViewCards.map((card) => (
            <div className="group relative" key={card.label}>
              <CompactStatCard
                active={quickView === card.view}
                label={card.label}
                onClick={() =>
                  setQuickView((current) => (current === card.view ? "all" : card.view))
                }
                tone={card.tone}
                value={card.value}
              />
              <span className="pointer-events-none absolute left-0 top-full z-30 hidden w-56 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-medium normal-case tracking-normal text-white shadow-xl group-hover:block group-focus-visible:block">
                {card.description}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              ASM
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              onChange={(event) => setAsmFilter(event.target.value)}
              value={asmFilter}
            >
              <option value="all">All ASMs</option>
              {asmOptions.map((asmNumber) => (
                <option key={asmNumber.asmNumber} value={String(asmNumber.asmNumber)}>
                  {getAsmDisplayLabel(asmNumber)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tag
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              onChange={(event) => setTagFilter(event.target.value)}
              value={tagFilter}
            >
              <option value="all">All tags</option>
              <option value="untagged">No tag</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Mode
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              onChange={(event) => setModeFilter(event.target.value)}
              value={modeFilter}
            >
              <option value="all">All modes</option>
              {modeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tech
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              onChange={(event) => setTechFilter(event.target.value)}
              value={techFilter}
            >
              <option value="all">All techs</option>
              <option value="unassigned">Unassigned</option>
              {techOptions.map((techNumber) => (
                <option key={techNumber} value={String(techNumber)}>
                  Tech {techNumber}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Blocker
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              onChange={(event) => setBlockerFilter(event.target.value as BlockerFilter)}
              value={blockerFilter}
            >
              <option value="all">All statuses</option>
              <option value="blocked">Blocked</option>
              <option value="unblocked">Unblocked</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Action lane
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              onChange={(event) => {
                const value = event.target.value;

                if (value === "needs-contact" || value === "contacted" || value === "no-record") {
                  setDueFilter("all");
                  setContactFilter(value);
                  return;
                }

                setContactFilter("all");
                setDueFilter(value as DueFilter);
              }}
              value={contactFilter !== "all" ? contactFilter : dueFilter}
            >
              <option value="all">All action lanes</option>
              <option value="needs-contact">Needs customer contact</option>
              <option value="contacted">Customer contacted</option>
              <option value="no-record">No contact record</option>
              <option value="overdue">Overdue due date</option>
              <option value="today">Due later today</option>
              <option value="upcoming">Due after today</option>
              <option value="missing">Missing due date</option>
            </select>
          </label>

          <div className="flex flex-col justify-end">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-transparent">
              Reset
            </span>
            <button
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-cyan-400 hover:text-slate-950 disabled:opacity-50"
              disabled={!filtersAreActive}
              onClick={resetFilters}
              type="button"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 max-h-[56rem] space-y-4 overflow-y-auto pr-1">
        {filteredRepairOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
            {emptyMessage}
          </div>
        ) : (
          filteredRepairOrders.map((repairOrder) => {
            const blocker = repairOrder.blockerState;
            const dueDate = getRepairOrderDueDate(repairOrder);
            const blocked = Boolean(blocker?.isBlocked);
            const contacted = repairOrder.contactState?.contacted ?? false;
            const hasRentalCar = repairOrder.contactState?.hasRentalCar ?? false;
            const repairValueLabel = repairOrder.repairValue
              ? repairValueLabels[repairOrder.repairValue]
              : null;
            const now = new Date();
            const needsContact = needsRepairOrderContact(repairOrder);
            const overdue = isRepairOrderOverdue(repairOrder, now);
            const dueToday = isRepairOrderDueToday(repairOrder, now);
            const urgencyScore = getRepairOrderUrgencyScore(repairOrder, slaSettings, now);

            return (
              <details
                key={repairOrder.roNumber}
                className={cn(
                  "rounded-[1.5rem] border p-5",
                  overdue
                    ? "border-rose-200 bg-rose-50"
                    : needsContact
                      ? "border-amber-200 bg-amber-50"
                      : blocked
                        ? "border-cyan-200 bg-cyan-50"
                        : "border-slate-200 bg-slate-50",
                )}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                          RO {repairOrder.roNumber}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                          {repairOrder.techNumber !== null
                            ? `Tech ${repairOrder.techNumber}${
                                repairOrder.techName ? ` · ${repairOrder.techName}` : ""
                              }`
                            : "Tech Unassigned"}
                        </span>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                          Tag {repairOrder.tag || "N/A"}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                          {repairOrder.mode}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
                          {getAsmDisplayLabel(repairOrder)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium",
                            needsContact
                              ? "bg-amber-100 text-amber-900"
                              : contacted
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700",
                          )}
                        >
                          {needsContact
                            ? "Needs Contact"
                            : contacted
                              ? "Contacted"
                              : "No Contact Record"}
                        </span>
                        {repairValueLabel ? (
                          <span
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                              getRepairValueBadgeClasses(repairOrder.repairValue!),
                            )}
                          >
                            Repair Value {repairValueLabel}
                          </span>
                        ) : null}
                        {hasRentalCar ? (
                          <span className="inline-flex animate-pulse items-center justify-center rounded-full border border-rose-700 bg-rose-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                            Rental Car
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-lg font-semibold text-slate-950">
                        {repairOrder.customerName} · {repairOrder.year} {repairOrder.model}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                        <span className="font-medium text-slate-950">Priority {urgencyScore}</span>
                        <span>
                          {blocked && blocker
                            ? blockerReasonLabels[blocker.blockerReason]
                            : "No active blocker"}
                        </span>
                        <span>
                          {repairOrder.techNumber !== null
                            ? `Assigned to ${repairOrder.techName ?? `tech ${repairOrder.techNumber}`}`
                            : "No tech assigned"}
                        </span>
                        <span>
                          Last contact{" "}
                          {repairOrder.contactRecords[0]
                            ? formatDateTime(repairOrder.contactRecords[0].contactedAt)
                            : "N/A"}
                        </span>
                        <span>Due {formatDateTime(dueDate)}</span>
                        <span>
                          {blocked && blocker
                            ? `${hoursSince(blocker.blockerStartedAt)}h blocked`
                            : "Ready to move"}
                        </span>
                        <span>
                          {overdue
                            ? "Overdue"
                            : dueToday
                              ? "Due later today"
                              : dueDate
                                ? "Upcoming"
                                : "Missing due date"}
                        </span>
                      </div>
                    </div>
                  </div>
                </summary>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_0.95fr]">
                  <div className="rounded-2xl border border-white/70 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Work Snapshot
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <p>
                        Repair value: {repairValueLabel || "Not set"}
                      </p>
                      <p>
                        Tag: {repairOrder.tag || "N/A"}
                      </p>
                      <p>
                        Tech:{" "}
                        {repairOrder.techNumber !== null
                          ? `${repairOrder.techName ?? "Unknown"} · ${repairOrder.techNumber}`
                          : "Unassigned"}
                      </p>
                      <p>Phone: {repairOrder.phone || "N/A"}</p>
                      <p>Promised: {repairOrder.promisedRaw}</p>
                      <p>Due: {formatDateTime(dueDate)}</p>
                      <p>
                        Blocker started:{" "}
                        {blocked && blocker ? formatDateOnly(blocker.blockerStartedAt) : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-white/70 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Notes
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {blocker?.foremanNotes || "No notes entered."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Customer Notes
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {repairOrder.contactState?.customerNotes || "No customer notes."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Call Summary
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {repairOrder.contactRecords.find((record) => record.linkedCallRecord?.callSummary)
                          ?.linkedCallRecord?.callSummary || "No call summary yet."}
                      </p>
                    </div>
                    <ContactHistoryList entries={repairOrder.contactRecords} />
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Actions
                    </p>
                    <div className="mt-3 grid gap-3">
                      {actionMode === "edit" ? (
                        <InlineBlockerEditor
                          blockerReason={blocker?.blockerReason ?? null}
                          foremanNotes={blocker?.foremanNotes ?? null}
                          isBlocked={blocked}
                          roNumber={repairOrder.roNumber}
                          techPromisedDate={blocker?.techPromisedDate ?? null}
                        />
                      ) : blocked ? (
                        <ClearBlockerButton roNumber={repairOrder.roNumber} />
                      ) : (
                        <p className="text-sm text-slate-500">
                          Open the dispatcher board to set or edit blockers.
                        </p>
                      )}

                      {contactMode === "edit" ? (
                        <>
                          <div className="border-t border-slate-200 pt-3">
                            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                              Customer Contact
                            </p>
                            <InlineContactEditor
                              contacted={contacted}
                              contactRecords={repairOrder.contactRecords}
                              hasRentalCar={hasRentalCar}
                              phone={repairOrder.phone}
                              repairValue={repairOrder.repairValue}
                              roNumber={repairOrder.roNumber}
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </details>
            );
          })
        )}
      </div>
    </section>
  );
}
