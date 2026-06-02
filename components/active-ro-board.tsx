"use client";

import { type BlockerReason, type RepairValue } from "@prisma/client";
import {
  Fragment,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ClearBlockerButton } from "@/components/clear-blocker-button";
import { CompactStatCard } from "@/components/compact-stat-card";
import { ContactEditModal } from "@/components/contact-edit-modal";
import { ContactHistoryList, type ContactHistoryEntry } from "@/components/contact-history-list";
import {
  type DerivedCallStatus,
  getDerivedCallStatus,
  getDerivedCallStatusClasses,
  getDerivedCallStatusLabel,
} from "@/lib/call-session-status";
import { InlineBlockerEditor } from "@/components/inline-blocker-editor";
import { blockerReasonLabels, repairValueLabels } from "@/lib/constants";
import {
  compareRepairOrderUrgency,
  hasRepairOrderContactToday,
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
  callSessions: Array<{
    callAnsweredAt: string | null;
    callEndedAt: string | null;
    callSessionId: string;
    callSummary: string | null;
    callState: string | null;
    callerOutcome: string | null;
    durationSeconds: number | null;
    goToAiSummary: string | null;
    goToPrimaryRecordingId: string | null;
    requestedAt: string;
    transcriptStatus: "FAILED" | "PENDING" | "PROCESSING" | "READY";
    wasConnected: boolean | null;
  }>;
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
type CallStatusFilter = "all" | "no-call" | DerivedCallStatus;
type BoardLayout = "table" | "cards" | "split";
type QuickView =
  | "all"
  | "urgent"
  | "blocked"
  | "contacted"
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
  callStatusFilter: CallStatusFilter;
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
      input.callStatusFilter !== "all" ||
      input.dueFilter !== "all",
  );
}

function getAsmDisplayLabel(input: { advisorName: string | null; asmNumber: number }) {
  return input.advisorName ? `ASM ${input.asmNumber} · ${input.advisorName}` : `ASM ${input.asmNumber}`;
}

function getCallAttemptTimestamp(
  callAttempt: {
    callAnsweredAt: string | null;
    callEndedAt: string | null;
    requestedAt?: string;
  } | null,
) {
  return callAttempt?.requestedAt ?? callAttempt?.callEndedAt ?? callAttempt?.callAnsweredAt ?? null;
}

function getLatestCallRecord(repairOrder: ActiveRepairOrder) {
  return (
    repairOrder.callSessions[0] ??
    repairOrder.contactRecords.find((record) => record.linkedCallRecord)?.linkedCallRecord ??
    null
  );
}

export function ActiveRoBoard({
  actionMode = "none",
  autoRefreshMs = null,
  contactMode = "none",
  emptyMessage = "No repair orders match the current filters.",
  repairOrders,
  slaSettings,
  subtitle,
  title,
}: {
  actionMode?: "none" | "edit";
  autoRefreshMs?: number | null;
  contactMode?: "none" | "edit";
  emptyMessage?: string;
  includeContactedTodayCard?: boolean;
  repairOrders: ActiveRepairOrder[];
  slaSettings: SlaSettingsValues;
  subtitle: string;
  title: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [asmFilter, setAsmFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");
  const [blockerFilter, setBlockerFilter] = useState<BlockerFilter>("all");
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [callStatusFilter, setCallStatusFilter] = useState<CallStatusFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [quickView, setQuickView] = useState<QuickView>("all");
  const [boardLayout, setBoardLayout] = useState<BoardLayout>("table");
  const [contactModalRoNumber, setContactModalRoNumber] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(() => new Set());
  const [selectedSplitRoNumber, setSelectedSplitRoNumber] = useState<number | null>(null);

  const refreshBoard = useEffectEvent(() => {
    startTransition(() => {
      router.refresh();
    });
  });

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshBoard();
      }
    };

    const onFocus = () => {
      refreshBoard();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshBoard();
      }
    }, autoRefreshMs);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [autoRefreshMs]);
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

  const techOptions = useMemo(
    () =>
      Array.from(
        new Map(
          repairOrders
            .filter((repairOrder) => repairOrder.techNumber !== null)
            .map((repairOrder) => [
              repairOrder.techNumber,
              {
                techName: repairOrder.techName,
                techNumber: repairOrder.techNumber,
              },
            ]),
        ).values(),
      ).sort((left, right) => (left.techNumber ?? 0) - (right.techNumber ?? 0)),
    [repairOrders],
  );

  const filteredRepairOrders = useMemo(() => {
    const now = new Date();
    const searchQuery = deferredSearch.trim().toLowerCase();

    return repairOrders
      .filter((repairOrder) => {
        const dueDate = getRepairOrderDueDate(repairOrder);
        const blocked = Boolean(repairOrder.blockerState?.isBlocked);
        const contacted = hasRepairOrderContactToday(repairOrder);
        const latestCallRecord = getLatestCallRecord(repairOrder);
        const latestCallStatus = latestCallRecord ? getDerivedCallStatus(latestCallRecord) : null;
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

        if (callStatusFilter === "no-call" && latestCallRecord) {
          return false;
        }

        if (
          callStatusFilter !== "all" &&
          callStatusFilter !== "no-call" &&
          latestCallStatus !== callStatusFilter
        ) {
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

        if (quickView === "contacted" && !contacted) {
          return false;
        }

        if (quickView === "overdue" && !isRepairOrderOverdue(repairOrder, now)) {
          return false;
        }

        if (quickView === "needs-contact" && contacted) {
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
    callStatusFilter,
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
        const contacted = hasRepairOrderContactToday(repairOrder);
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

        if (contacted) {
          summary.contactedToday += 1;
        } else {
          summary.needsContactToday += 1;
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
        contactedToday: 0,
        highValue: 0,
        needsContact: 0,
        needsContactToday: 0,
        overdue: 0,
        rentalCar: 0,
        urgent: 0,
        visible: 0,
      },
    );
  }, [filteredRepairOrders, slaSettings]);

  const contactModalRepairOrder =
    contactModalRoNumber !== null
      ? repairOrders.find((repairOrder) => repairOrder.roNumber === contactModalRoNumber) ?? null
      : null;

  const resetFilters = () => {
    setSearch("");
    setAsmFilter("all");
    setTagFilter("all");
    setModeFilter("all");
    setTechFilter("all");
    setBlockerFilter("all");
    setContactFilter("all");
    setCallStatusFilter("all");
    setDueFilter("all");
    setQuickView("all");
  };

  const toggleExpandedRow = (roNumber: number) => {
    setExpandedRows((current) => {
      const next = new Set(current);

      if (next.has(roNumber)) {
        next.delete(roNumber);
      } else {
        next.add(roNumber);
      }

      return next;
    });
  };

  const filtersAreActive = hasActiveFilters({
    asmFilter,
    blockerFilter,
    callStatusFilter,
    contactFilter,
    dueFilter,
    modeFilter,
    quickView,
    search,
    tagFilter,
    techFilter,
  });

  const selectedSplitRepairOrder =
    filteredRepairOrders.find((repairOrder) => repairOrder.roNumber === selectedSplitRoNumber) ??
    filteredRepairOrders[0] ??
    null;

  const quickViewCards = [
    {
      description: "All visible active repair orders",
      label: "Total",
      tone: "neutral",
      value: filteredStats.visible,
      view: "all" as const,
    },
    {
      description: "Overdue, no-contact, rental-car, and high-value work",
      label: "Needs Action",
      tone: "rose",
      value: filteredStats.urgent,
      view: "urgent" as const,
    },
    {
      description: "All active repair orders currently blocked",
      label: "Needs Contact",
      tone: "amber",
      value: filteredStats.needsContactToday,
      view: "needs-contact" as const,
    },
    {
      description: "All active repair orders currently blocked",
      label: "Blocked",
      tone: "blue",
      value: filteredStats.blocked,
      view: "blocked" as const,
    },
    {
      description: "Past the current due promise",
      label: "Overdue",
      tone: "rose",
      value: filteredStats.overdue,
      view: "overdue" as const,
    },
    {
      description: "Open work with rental-car exposure",
      label: "Rental Car",
      tone: "violet",
      value: filteredStats.rentalCar,
      view: "rental-car" as const,
    },
    {
      description: "Active ROs with a contact logged today",
      label: "Contacted",
      tone: "emerald",
      value: filteredStats.contactedToday,
      view: "contacted" as const,
    },
  ];

  const statusFilterValue =
    blockerFilter !== "all" ? blockerFilter : contactFilter !== "all" ? contactFilter : dueFilter;

  const setStatusFilter = (value: string) => {
    setBlockerFilter("all");
    setContactFilter("all");
    setDueFilter("all");

    if (value === "blocked" || value === "unblocked") {
      setBlockerFilter(value);
      return;
    }

    if (value === "needs-contact" || value === "contacted") {
      setContactFilter(value);
      return;
    }

    if (value === "overdue") {
      setDueFilter(value);
    }
  };

  return (
    <section className="space-y-4">
      <>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <label className="relative w-72 max-w-full">
              <span className="sr-only">Search repair orders</span>
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  d="m14 14 3 3M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                />
              </svg>
              <input
                className="h-8 w-full rounded-md bg-white pl-8 pr-3 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search RO, customer, tech, blocker…"
                value={search}
              />
            </label>
            <div className="inline-flex h-8 items-center rounded-md bg-white p-0.5 ring-1 ring-inset ring-zinc-200">
              {(["table", "cards", "split"] as const).map((layout) => (
                <button
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium capitalize transition",
                    boardLayout === layout
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                  key={layout}
                  onClick={() => setBoardLayout(layout)}
                  type="button"
                >
                  {layout === "table" ? (
                    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 20 20">
                      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
                    </svg>
                  ) : layout === "cards" ? (
                    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 20 20">
                      <path d="M3 4h6v5H3V4Zm8 0h6v5h-6V4ZM3 11h6v5H3v-5Zm8 0h6v5h-6v-5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 20 20">
                      <path d="M3 4h5v12H3V4Zm8 0h6v12h-6V4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
                    </svg>
                  )}
                  <span className="hidden md:inline">{layout}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
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
              <span className="pointer-events-none absolute left-0 top-full z-30 hidden w-56 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium normal-case tracking-normal text-white shadow-xl group-hover:block group-focus-visible:block">
                {card.description}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-zinc-200">
          <svg
            aria-hidden="true"
            className="size-4 text-zinc-400"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              d="M3 5h14l-5.5 6.5V16l-3-1.5v-3L3 5z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
            />
          </svg>

          <label className="relative w-48">
            <span className="sr-only">ASM filter</span>
            <select
              className="h-8 w-full appearance-none rounded-md bg-white pl-3 pr-8 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
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
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
          </label>

          <label className="relative w-36">
            <span className="sr-only">Mode filter</span>
            <select
              className="h-8 w-full appearance-none rounded-md bg-white pl-3 pr-8 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
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
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
          </label>

          <label className="relative w-48">
            <span className="sr-only">Tech filter</span>
            <select
              className="h-8 w-full appearance-none rounded-md bg-white pl-3 pr-8 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              onChange={(event) => setTechFilter(event.target.value)}
              value={techFilter}
            >
              <option value="all">All techs</option>
              <option value="unassigned">Unassigned tech</option>
              {techOptions.map((tech) => (
                <option key={tech.techNumber} value={String(tech.techNumber)}>
                  Tech {tech.techNumber}
                  {tech.techName ? ` · ${tech.techName}` : ""}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
          </label>

          <label className="relative w-44">
            <span className="sr-only">Status filter</span>
            <select
              className="h-8 w-full appearance-none rounded-md bg-white pl-3 pr-8 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilterValue}
            >
              <option value="all">All statuses</option>
              <option value="blocked">Blocked</option>
              <option value="unblocked">Unblocked</option>
              <option value="overdue">Overdue</option>
              <option value="needs-contact">Needs contact</option>
              <option value="contacted">Contacted today</option>
            </select>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
          </label>

          <label className="relative w-48">
            <span className="sr-only">Call status filter</span>
            <select
              className="h-8 w-full appearance-none rounded-md bg-white pl-3 pr-8 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              onChange={(event) => setCallStatusFilter(event.target.value as CallStatusFilter)}
              value={callStatusFilter}
            >
              <option value="all">All call statuses</option>
              <option value="HUMAN_ANSWERED">
                {getDerivedCallStatusLabel("HUMAN_ANSWERED")}
              </option>
              <option value="VOICEMAIL_LEFT">
                {getDerivedCallStatusLabel("VOICEMAIL_LEFT")}
              </option>
              <option value="VOICEMAIL_NO_MESSAGE">
                {getDerivedCallStatusLabel("VOICEMAIL_NO_MESSAGE")}
              </option>
              <option value="NO_ANSWER">{getDerivedCallStatusLabel("NO_ANSWER")}</option>
              <option value="IN_PROGRESS">{getDerivedCallStatusLabel("IN_PROGRESS")}</option>
              <option value="PENDING">{getDerivedCallStatusLabel("PENDING")}</option>
              <option value="no-call">No call record</option>
            </select>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
          </label>

          <span className="ml-auto text-xs text-zinc-500">
            Showing{" "}
            <span className="font-mono font-semibold text-zinc-900">
              {filteredRepairOrders.length}
            </span>{" "}
            of <span className="font-mono text-zinc-700">{repairOrders.length}</span>
          </span>

          {filtersAreActive ? (
            <button
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md bg-transparent px-2.5 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-transparent transition hover:bg-zinc-100"
              onClick={resetFilters}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="size-3.5"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  d="m5 5 10 10M15 5 5 15"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                />
              </svg>
              Reset
            </button>
          ) : null}
        </div>
      </>

      <div className="max-h-[56rem] overflow-y-auto rounded-lg border border-zinc-200 bg-white">
        {filteredRepairOrders.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-zinc-500">
            {emptyMessage}
          </div>
        ) : boardLayout === "cards" ? (
          <div className="grid gap-3 p-3 lg:grid-cols-2">
            {filteredRepairOrders.map((repairOrder) => {
              const blocker = repairOrder.blockerState;
              const dueDate = getRepairOrderDueDate(repairOrder);
              const blocked = Boolean(blocker?.isBlocked);
              const contacted = hasRepairOrderContactToday(repairOrder);
              const hasRentalCar = repairOrder.contactState?.hasRentalCar ?? false;
              const repairValueLabel = repairOrder.repairValue
                ? repairValueLabels[repairOrder.repairValue]
                : null;
              const now = new Date();
              const needsContact = needsRepairOrderContact(repairOrder);
              const overdue = isRepairOrderOverdue(repairOrder, now);
              const dueToday = isRepairOrderDueToday(repairOrder, now);

              return (
                <article
                  className={cn(
                    "ro-card rounded-lg border bg-white p-4",
                    overdue
                      ? "border-rose-200"
                      : needsContact
                        ? "border-amber-200"
                        : blocked
                          ? "border-blue-200"
                          : "border-zinc-200",
                  )}
                  key={repairOrder.roNumber}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-zinc-900">
                        RO {repairOrder.roNumber}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-zinc-900">
                        {repairOrder.customerName}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {repairOrder.year} {repairOrder.model} · {repairOrder.mode}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium",
                        overdue
                          ? "bg-rose-100 text-rose-800"
                          : dueToday
                            ? "bg-amber-100 text-amber-900"
                            : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {overdue ? "Overdue" : dueToday ? "Today" : "Upcoming"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                    <p>ASM {repairOrder.asmNumber}</p>
                    <p>
                      {repairOrder.techNumber !== null
                        ? `Tech ${repairOrder.techNumber}`
                        : "Tech unassigned"}
                    </p>
                    <p className="truncate">
                      {blocked && blocker
                        ? blockerReasonLabels[blocker.blockerReason]
                        : "No active blocker"}
                    </p>
                    <p>Due {formatDateTime(dueDate)}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                        needsContact
                          ? "bg-amber-100 text-amber-900"
                          : contacted
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {needsContact
                        ? "Needs Contact"
                        : contacted
                          ? "Contacted"
                          : "No Contact Today"}
                    </span>
                    {repairValueLabel ? (
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                          getRepairValueBadgeClasses(repairOrder.repairValue!),
                        )}
                      >
                        {repairValueLabel}
                      </span>
                    ) : null}
                    {hasRentalCar ? (
                      <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        Rental
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                    <button
                      className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 hover:text-zinc-950"
                      onClick={() => toggleExpandedRow(repairOrder.roNumber)}
                      type="button"
                    >
                      {expandedRows.has(repairOrder.roNumber) ? "Hide Details" : "View Details"}
                    </button>
                    {contactMode === "edit" ? (
                      <button
                        className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 hover:text-zinc-950"
                        onClick={() => setContactModalRoNumber(repairOrder.roNumber)}
                        type="button"
                      >
                        Edit Contact
                      </button>
                    ) : null}
                  </div>

                  {expandedRows.has(repairOrder.roNumber) ? (
                    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Notes</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                        {blocker?.foremanNotes ||
                          repairOrder.contactState?.customerNotes ||
                          "No notes entered."}
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : boardLayout === "split" ? (
          <div className="grid min-h-[32rem] gap-0 lg:grid-cols-[24rem_minmax(0,1fr)]">
            <div className="border-b border-zinc-200 lg:border-b-0 lg:border-r">
              <div className="max-h-[56rem] overflow-y-auto">
                {filteredRepairOrders.map((repairOrder) => {
                  const selected = selectedSplitRepairOrder?.roNumber === repairOrder.roNumber;
                  const blocker = repairOrder.blockerState;
                  const blocked = Boolean(blocker?.isBlocked);
                  const needsContact = needsRepairOrderContact(repairOrder);

                  return (
                    <button
                      className={cn(
                        "block w-full border-b border-zinc-100 px-4 py-3 text-left transition hover:bg-zinc-50",
                        selected && "bg-zinc-100",
                      )}
                      key={repairOrder.roNumber}
                      onClick={() => setSelectedSplitRoNumber(repairOrder.roNumber)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-zinc-900">
                            RO {repairOrder.roNumber}
                          </p>
                          <p className="mt-1 truncate text-sm font-medium text-zinc-900">
                            {repairOrder.customerName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {repairOrder.year} {repairOrder.model}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                            needsContact
                              ? "bg-amber-100 text-amber-900"
                              : blocked
                                ? "bg-blue-50 text-blue-700"
                                : "bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {needsContact ? "Contact" : blocked ? "Blocked" : "Open"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4">
              {selectedSplitRepairOrder ? (
                (() => {
                  const repairOrder = selectedSplitRepairOrder;
                  const blocker = repairOrder.blockerState;
                  const dueDate = getRepairOrderDueDate(repairOrder);
                  const blocked = Boolean(blocker?.isBlocked);
                  const repairValueLabel = repairOrder.repairValue
                    ? repairValueLabels[repairOrder.repairValue]
                    : null;

                  return (
                    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                      <section className="rounded-lg border border-zinc-200 bg-white p-4">
                        <p className="font-mono text-sm font-semibold text-zinc-900">
                          RO {repairOrder.roNumber}
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-zinc-900">
                          {repairOrder.customerName}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500">
                          {repairOrder.year} {repairOrder.model} · {repairOrder.mode}
                        </p>
                        <div className="mt-5 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
                          <p>Advisor: {getAsmDisplayLabel(repairOrder)}</p>
                          <p>
                            Tech:{" "}
                            {repairOrder.techNumber !== null
                              ? `${repairOrder.techName ?? "Unknown"} · ${repairOrder.techNumber}`
                              : "Unassigned"}
                          </p>
                          <p>Phone: {repairOrder.phone || "N/A"}</p>
                          <p>Promised: {repairOrder.promisedRaw}</p>
                          <p>Due: {formatDateTime(dueDate)}</p>
                          <p>Repair value: {repairValueLabel || "Not set"}</p>
                        </div>
                        <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                            Notes
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                            {blocker?.foremanNotes ||
                              repairOrder.contactState?.customerNotes ||
                              "No notes entered."}
                          </p>
                        </div>
                      </section>

                      <section className="rounded-lg border border-zinc-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                          Actions
                        </p>
                        <div className="mt-3 grid gap-3">
                          {actionMode === "edit" ? (
                            <InlineBlockerEditor
                              blockerReason={blocker?.blockerReason ?? null}
                              isBlocked={blocked}
                              key={`${repairOrder.roNumber}-${blocker?.blockerReason ?? "none"}-${
                                blocker?.techPromisedDate ?? "none"
                              }`}
                              roNumber={repairOrder.roNumber}
                              techPromisedDate={blocker?.techPromisedDate ?? null}
                            />
                          ) : blocked ? (
                            <ClearBlockerButton roNumber={repairOrder.roNumber} />
                          ) : (
                            <p className="text-sm text-zinc-500">
                              Open the dispatcher board to set or edit blockers.
                            </p>
                          )}
                          {contactMode === "edit" ? (
                            <button
                              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 hover:text-zinc-950"
                              onClick={() => setContactModalRoNumber(repairOrder.roNumber)}
                              type="button"
                            >
                              Edit Contact
                            </button>
                          ) : null}
                        </div>
                      </section>
                    </div>
                  );
                })()
              ) : null}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[78rem] text-left text-sm text-zinc-700">
              <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/95 text-[11px] uppercase tracking-[0.08em] text-zinc-500 backdrop-blur">
                <tr>
                  <th className="w-10 px-3 py-2 font-medium" />
                  <th className="px-3 py-2 font-medium">RO</th>
                  <th className="px-3 py-2 font-medium">Customer · Vehicle</th>
                  <th className="px-3 py-2 font-medium">ASM</th>
                  <th className="px-3 py-2 font-medium">Tech</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Blocker</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                  <th className="px-3 py-2 font-medium">Last Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredRepairOrders.map((repairOrder) => {
                  const blocker = repairOrder.blockerState;
                  const dueDate = getRepairOrderDueDate(repairOrder);
                  const blocked = Boolean(blocker?.isBlocked);
                  const contacted = hasRepairOrderContactToday(repairOrder);
                  const hasRentalCar = repairOrder.contactState?.hasRentalCar ?? false;
                  const repairValueLabel = repairOrder.repairValue
                    ? repairValueLabels[repairOrder.repairValue]
                    : null;
                  const now = new Date();
                  const needsContact = needsRepairOrderContact(repairOrder);
                  const overdue = isRepairOrderOverdue(repairOrder, now);
                  const dueToday = isRepairOrderDueToday(repairOrder, now);
                  const urgencyScore = getRepairOrderUrgencyScore(repairOrder, slaSettings, now);
                  const expanded = expandedRows.has(repairOrder.roNumber);
                  const latestContact = repairOrder.contactRecords[0] ?? null;
                  const latestCallRecord = getLatestCallRecord(repairOrder);
                  const callStatus = latestCallRecord ? getDerivedCallStatus(latestCallRecord) : null;
                  const callSummary =
                    latestCallRecord?.callSummary || latestCallRecord?.goToAiSummary || null;
                  const attemptedToday = Boolean(
                    latestCallRecord &&
                      new Date(getCallAttemptTimestamp(latestCallRecord) ?? "").toDateString() ===
                        new Date().toDateString(),
                  );

                  return (
                    <Fragment key={repairOrder.roNumber}>
                      <tr
                        className={cn(
                          "transition hover:bg-zinc-50",
                          expanded && "bg-zinc-50",
                          overdue && "bg-rose-50/50 hover:bg-rose-50",
                          needsContact && !overdue && "bg-amber-50/50 hover:bg-amber-50",
                        )}
                      >
                        <td className="px-3 py-3 align-middle">
                          <button
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Collapse" : "Expand"} RO ${repairOrder.roNumber}`}
                            className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white hover:text-zinc-900"
                            onClick={() => toggleExpandedRow(repairOrder.roNumber)}
                            type="button"
                          >
                            {expanded ? "v" : ">"}
                          </button>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <button
                            className="font-mono text-sm font-semibold text-zinc-900"
                            onClick={() => toggleExpandedRow(repairOrder.roNumber)}
                            type="button"
                          >
                            {repairOrder.roNumber}
                          </button>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {repairOrder.tag ? (
                              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600">
                                {repairOrder.tag}
                              </span>
                            ) : null}
                            {repairValueLabel ? (
                              <span
                                className={cn(
                                  "rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                                  getRepairValueBadgeClasses(repairOrder.repairValue!),
                                )}
                              >
                                {repairValueLabel}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <p className="font-medium text-zinc-900">{repairOrder.customerName}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {repairOrder.year} {repairOrder.model} · {repairOrder.mode}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <p className="text-sm text-zinc-900">ASM {repairOrder.asmNumber}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {repairOrder.advisorName || "Unassigned"}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <p className="text-sm text-zinc-900">
                            {repairOrder.techNumber !== null ? `Tech ${repairOrder.techNumber}` : "Unassigned"}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {repairOrder.techName || "No tech name"}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                                blocked ? "bg-blue-50 text-blue-700" : "bg-zinc-100 text-zinc-600",
                              )}
                            >
                              {blocked ? "Blocked" : "Open"}
                            </span>
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                                needsContact
                                  ? "bg-amber-100 text-amber-900"
                                  : contacted
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-zinc-100 text-zinc-600",
                              )}
                            >
                              {needsContact
                                ? "Needs Contact"
                                : contacted
                                  ? "Contacted"
                                  : "No Contact Today"}
                            </span>
                            {hasRentalCar ? (
                              <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                Rental
                              </span>
                            ) : null}
                            {!contacted && attemptedToday && callStatus ? (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getDerivedCallStatusClasses(callStatus)}`}
                              >
                                Attempted: {getDerivedCallStatusLabel(callStatus)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="max-w-52 px-3 py-3 align-middle">
                          <p className="truncate text-sm text-zinc-900">
                            {blocked && blocker
                              ? blockerReasonLabels[blocker.blockerReason]
                              : "No active blocker"}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {blocked && blocker
                              ? `${hoursSince(blocker.blockerStartedAt)}h blocked`
                              : `Priority ${urgencyScore}`}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                              overdue
                                ? "bg-rose-100 text-rose-800"
                                : dueToday
                                  ? "bg-amber-100 text-amber-900"
                                  : dueDate
                                    ? "bg-zinc-100 text-zinc-600"
                                    : "bg-zinc-100 text-zinc-500",
                            )}
                          >
                            {overdue ? "Overdue" : dueToday ? "Today" : dueDate ? "Upcoming" : "Missing"}
                          </span>
                          <p className="mt-1 text-xs text-zinc-500">{formatDateTime(dueDate)}</p>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <p className="text-sm text-zinc-900">
                            {latestContact ? formatDateTime(latestContact.contactedAt) : "N/A"}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {latestContact?.advisorLabel || "No contact"}
                          </p>
                        </td>
                      </tr>

                      {expanded ? (
                        <tr className="border-t border-zinc-100 bg-zinc-50/70">
                          <td colSpan={9} className="px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.95fr]">
                              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                                  Work Snapshot
                                </p>
                                <div className="mt-3 space-y-2 text-sm text-zinc-700">
                                  <p>Repair value: {repairValueLabel || "Not set"}</p>
                                  <p>Tag: {repairOrder.tag || "N/A"}</p>
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
                                    {blocked && blocker
                                      ? formatDateOnly(blocker.blockerStartedAt)
                                      : "N/A"}
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-4">
                                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                  <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                                    Notes
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                                    {blocker?.foremanNotes || "No notes entered."}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                  <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                                    Customer Notes
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                                    {repairOrder.contactState?.customerNotes || "No customer notes."}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                  <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                                    Latest Call
                                  </p>
                                  {latestCallRecord && callStatus ? (
                                    <>
                                      <span
                                        className={`mt-2 inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${getDerivedCallStatusClasses(callStatus)}`}
                                      >
                                        {getDerivedCallStatusLabel(callStatus)}
                                      </span>
                                      <p className="mt-2 text-sm leading-6 text-zinc-700">
                                        {callSummary || "No call summary yet."}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="mt-2 text-sm leading-6 text-zinc-700">
                                      No call record yet.
                                    </p>
                                  )}
                                </div>
                                <ContactHistoryList entries={repairOrder.contactRecords} />
                              </div>

                              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                                  Actions
                                </p>
                                <div className="mt-3 grid gap-3">
                                  {actionMode === "edit" ? (
                                    <InlineBlockerEditor
                                      blockerReason={blocker?.blockerReason ?? null}
                                      isBlocked={blocked}
                                      key={`${repairOrder.roNumber}-${blocker?.blockerReason ?? "none"}-${
                                        blocker?.techPromisedDate ?? "none"
                                      }`}
                                      roNumber={repairOrder.roNumber}
                                      techPromisedDate={blocker?.techPromisedDate ?? null}
                                    />
                                  ) : blocked ? (
                                    <ClearBlockerButton roNumber={repairOrder.roNumber} />
                                  ) : (
                                    <p className="text-sm text-zinc-500">
                                      Open the dispatcher board to set or edit blockers.
                                    </p>
                                  )}

                                  {contactMode === "edit" ? (
                                    <div className="border-t border-zinc-200 pt-3">
                                      <p className="mb-3 text-xs uppercase tracking-[0.08em] text-zinc-500">
                                        Customer Contact
                                      </p>
                                      <button
                                        className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 hover:text-zinc-950"
                                        onClick={() => setContactModalRoNumber(repairOrder.roNumber)}
                                        type="button"
                                      >
                                        <span className="text-sm leading-none">+</span>
                                        <span>Edit Contact</span>
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {contactModalRepairOrder ? (
        <ContactEditModal
          contacted={contactModalRepairOrder.contactState?.contacted ?? false}
          contactRecords={contactModalRepairOrder.contactRecords}
          customerName={contactModalRepairOrder.customerName}
          hasRentalCar={contactModalRepairOrder.contactState?.hasRentalCar ?? false}
          onClose={() => setContactModalRoNumber(null)}
          phone={contactModalRepairOrder.phone}
          repairValue={contactModalRepairOrder.repairValue}
          roNumber={contactModalRepairOrder.roNumber}
        />
      ) : null}
    </section>
  );
}
