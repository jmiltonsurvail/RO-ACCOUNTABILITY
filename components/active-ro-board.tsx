"use client";

import { type BlockerReason } from "@prisma/client";
import { useDeferredValue, useMemo, useState } from "react";
import { ClearBlockerButton } from "@/components/clear-blocker-button";
import { InlineContactEditor } from "@/components/inline-contact-editor";
import { InlineBlockerEditor } from "@/components/inline-blocker-editor";
import { blockerReasonLabels } from "@/lib/constants";
import { cn, formatDateOnly, formatDateTime, hoursSince } from "@/lib/utils";

type ActiveRepairOrder = {
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
  roNumber: number;
  tag: string | null;
  techName: string | null;
  techNumber: number | null;
  year: number;
};

type BlockerFilter = "all" | "blocked" | "unblocked";
type ContactFilter = "all" | "needs-contact" | "contacted" | "no-record";
type DueFilter = "all" | "overdue" | "today" | "upcoming" | "missing";

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDueDate(repairOrder: ActiveRepairOrder) {
  return parseDate(
    repairOrder.blockerState?.techPromisedDate ?? repairOrder.promisedAtNormalized,
  );
}

function isDueToday(date: Date | null, now: Date) {
  if (!date) {
    return false;
  }

  return date.toDateString() === now.toDateString() && date >= now;
}

function isOverdue(date: Date | null, now: Date) {
  return Boolean(date && date < now);
}

function isUpcoming(date: Date | null, now: Date) {
  if (!date) {
    return false;
  }

  const tomorrow = new Date(now);
  tomorrow.setHours(23, 59, 59, 999);

  return date > tomorrow;
}

function hasActiveFilters(input: {
  asmFilter: string;
  blockerFilter: BlockerFilter;
  contactFilter: ContactFilter;
  dueFilter: DueFilter;
  modeFilter: string;
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
      input.blockerFilter !== "all" ||
      input.contactFilter !== "all" ||
      input.dueFilter !== "all",
  );
}

export function ActiveRoBoard({
  actionMode = "none",
  contactMode = "none",
  emptyMessage = "No repair orders match the current filters.",
  repairOrders,
  subtitle,
  title,
}: {
  actionMode?: "none" | "edit";
  contactMode?: "none" | "edit";
  emptyMessage?: string;
  repairOrders: ActiveRepairOrder[];
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
  const deferredSearch = useDeferredValue(search);

  const asmOptions = useMemo(
    () =>
      Array.from(new Set(repairOrders.map((repairOrder) => repairOrder.asmNumber))).sort(
        (left, right) => left - right,
      ),
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
        const dueDate = getDueDate(repairOrder);
        const blocked = Boolean(repairOrder.blockerState?.isBlocked);
        const contacted = repairOrder.contactState?.contacted ?? false;
        const searchIndex = [
          repairOrder.roNumber,
          repairOrder.tag ?? "",
          repairOrder.customerName,
          repairOrder.model,
          repairOrder.mode,
          repairOrder.phone ?? "",
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

        if (dueFilter === "overdue" && !isOverdue(dueDate, now)) {
          return false;
        }

        if (dueFilter === "today" && !isDueToday(dueDate, now)) {
          return false;
        }

        if (dueFilter === "upcoming" && !isUpcoming(dueDate, now)) {
          return false;
        }

        if (dueFilter === "missing" && dueDate) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        const now = new Date();
        const leftDueDate = getDueDate(left);
        const rightDueDate = getDueDate(right);
        const leftBlocked = Boolean(left.blockerState?.isBlocked);
        const rightBlocked = Boolean(right.blockerState?.isBlocked);
        const leftNeedsContact = leftBlocked && !left.contactState?.contacted;
        const rightNeedsContact = rightBlocked && !right.contactState?.contacted;
        const leftOverdue = isOverdue(leftDueDate, now);
        const rightOverdue = isOverdue(rightDueDate, now);

        if (leftNeedsContact !== rightNeedsContact) {
          return leftNeedsContact ? -1 : 1;
        }

        if (leftOverdue !== rightOverdue) {
          return leftOverdue ? -1 : 1;
        }

        if (leftBlocked !== rightBlocked) {
          return leftBlocked ? -1 : 1;
        }

        if (leftDueDate && rightDueDate) {
          return leftDueDate.getTime() - rightDueDate.getTime();
        }

        if (leftDueDate || rightDueDate) {
          return leftDueDate ? -1 : 1;
        }

        return left.roNumber - right.roNumber;
      });
  }, [asmFilter, blockerFilter, contactFilter, deferredSearch, dueFilter, modeFilter, repairOrders, tagFilter, techFilter]);

  const filteredStats = useMemo(() => {
    const now = new Date();

    return filteredRepairOrders.reduce(
      (summary, repairOrder) => {
        const dueDate = getDueDate(repairOrder);
        const blocked = Boolean(repairOrder.blockerState?.isBlocked);
        const needsContact = blocked && !repairOrder.contactState?.contacted;

        summary.visible += 1;

        if (blocked) {
          summary.blocked += 1;
        }

        if (isOverdue(dueDate, now)) {
          summary.overdue += 1;
        }

        if (needsContact) {
          summary.needsContact += 1;
        }

        return summary;
      },
      {
        blocked: 0,
        needsContact: 0,
        overdue: 0,
        visible: 0,
      },
    );
  }, [filteredRepairOrders]);

  const resetFilters = () => {
    setSearch("");
    setAsmFilter("all");
    setTagFilter("all");
    setModeFilter("all");
    setTechFilter("all");
    setBlockerFilter("all");
    setContactFilter("all");
    setDueFilter("all");
  };

  const filtersAreActive = hasActiveFilters({
    asmFilter,
    blockerFilter,
    contactFilter,
    dueFilter,
    modeFilter,
    search,
    tagFilter,
    techFilter,
  });

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
          Showing {filteredRepairOrders.length} of {repairOrders.length}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-8">
        <label className="md:col-span-2 xl:col-span-2">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Search
          </span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="RO, tag, customer, model, phone, tech, blocker"
            value={search}
          />
        </label>

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
              <option key={asmNumber} value={String(asmNumber)}>
                ASM {asmNumber}
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
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
          Visible: <span className="font-semibold text-slate-950">{filteredStats.visible}</span>
        </div>
        <div className="rounded-full bg-amber-100 px-4 py-2 text-sm text-amber-900">
          Blocked: <span className="font-semibold">{filteredStats.blocked}</span>
        </div>
        <div className="rounded-full bg-rose-100 px-4 py-2 text-sm text-rose-800">
          Overdue: <span className="font-semibold">{filteredStats.overdue}</span>
        </div>
        <div className="rounded-full bg-cyan-100 px-4 py-2 text-sm text-cyan-900">
          Needs contact: <span className="font-semibold">{filteredStats.needsContact}</span>
        </div>
        <button
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-400 hover:text-slate-950 disabled:opacity-50"
          disabled={!filtersAreActive}
          onClick={resetFilters}
          type="button"
        >
          Reset filters
        </button>
      </div>

      <div className="mt-6 max-h-[56rem] space-y-4 overflow-y-auto pr-1">
        {filteredRepairOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
            {emptyMessage}
          </div>
        ) : (
          filteredRepairOrders.map((repairOrder) => {
            const blocker = repairOrder.blockerState;
            const dueDate = getDueDate(repairOrder);
            const blocked = Boolean(blocker?.isBlocked);
            const contacted = repairOrder.contactState?.contacted ?? false;
            const hasRentalCar = repairOrder.contactState?.hasRentalCar ?? false;
            const needsContact = blocked && !contacted;
            const overdue = isOverdue(dueDate, new Date());
            const dueToday = isDueToday(dueDate, new Date());

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
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                          RO {repairOrder.roNumber}
                        </p>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
                          ASM {repairOrder.asmNumber}
                        </span>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                          Tag {repairOrder.tag || "N/A"}
                        </span>
                        {hasRentalCar ? (
                          <span className="inline-flex size-8 animate-pulse items-center justify-center rounded-lg border border-rose-700 bg-rose-600 text-xs font-bold uppercase tracking-[0.18em] text-white">
                            RC
                          </span>
                        ) : null}
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                          {repairOrder.mode}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                          {repairOrder.techNumber !== null
                            ? `Tech ${repairOrder.techNumber}${
                                repairOrder.techName ? ` · ${repairOrder.techName}` : ""
                              }`
                            : "Tech Unassigned"}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium",
                            blocked
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-100 text-emerald-800",
                          )}
                        >
                          {blocked ? "Blocked" : "Unblocked"}
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
                      </div>
                      <p className="mt-3 text-lg font-semibold text-slate-950">
                        {repairOrder.customerName} · {repairOrder.year} {repairOrder.model}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
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
                              customerNotes={repairOrder.contactState?.customerNotes ?? null}
                              hasRentalCar={hasRentalCar}
                              phone={repairOrder.phone}
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
