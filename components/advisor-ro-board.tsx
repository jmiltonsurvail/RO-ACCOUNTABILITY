"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  AdvisorContactCard,
  type AdvisorRepairOrder,
} from "@/components/advisor-contact-card";
import { CompactStatCard } from "@/components/compact-stat-card";
import {
  hasRepairOrderContactToday,
  isRepairOrderAtRisk,
  isRepairOrderOverdue,
} from "@/lib/repair-order-urgency";
import { blockerReasonLabels, repairValueLabels } from "@/lib/constants";
import type { SlaSettingsValues } from "@/lib/sla-settings";
import { cn, formatDateTime } from "@/lib/utils";

type AdvisorQuickFilter = "all" | "at-risk" | "needs-contact" | "overdue";
type AdvisorBoardLayout = "list" | "cards";

export function AdvisorRoBoard({
  repairOrders,
  slaSettings,
}: {
  repairOrders: AdvisorRepairOrder[];
  slaSettings: SlaSettingsValues;
}) {
  const [quickFilter, setQuickFilter] = useState<AdvisorQuickFilter>("all");
  const [boardLayout, setBoardLayout] = useState<AdvisorBoardLayout>("list");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredRepairOrders = useMemo(() => {
    const searchQuery = deferredSearch.trim().toLowerCase();

    return repairOrders.filter((repairOrder) => {
      const searchIndex = [
        repairOrder.roNumber,
        repairOrder.tag ?? "",
        repairOrder.customerName,
        repairOrder.model,
        repairOrder.mode,
        repairOrder.advisorName ?? "",
        repairOrder.phone ?? "",
        repairOrder.techName ?? "",
        repairOrder.techNumber !== null ? `tech ${repairOrder.techNumber}` : "unassigned tech",
        `asm ${repairOrder.asmNumber}`,
        repairOrder.riskReason,
      ]
        .join(" ")
        .toLowerCase();

      if (searchQuery && !searchIndex.includes(searchQuery)) {
        return false;
      }

      if (quickFilter === "at-risk") {
        return isRepairOrderAtRisk(repairOrder, slaSettings);
      }

      if (quickFilter === "needs-contact") {
        return !hasRepairOrderContactToday(repairOrder);
      }

      if (quickFilter === "overdue") {
        return isRepairOrderOverdue(repairOrder);
      }

      return true;
    });
  }, [deferredSearch, quickFilter, repairOrders, slaSettings]);

  const totalAtRisk = useMemo(
    () =>
      repairOrders.filter((repairOrder) => isRepairOrderAtRisk(repairOrder, slaSettings)).length,
    [repairOrders, slaSettings],
  );
  const totalNeedsContact = useMemo(
    () => repairOrders.filter((repairOrder) => !hasRepairOrderContactToday(repairOrder)).length,
    [repairOrders],
  );
  const totalOverdue = useMemo(
    () => repairOrders.filter((repairOrder) => isRepairOrderOverdue(repairOrder)).length,
    [repairOrders],
  );

  const filtersAreActive = quickFilter !== "all" || search.trim().length > 0;

  return (
    <div className="space-y-4">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Advisor Workload</h2>
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
              {(["list", "cards"] as const).map((layout) => (
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
                  {layout === "list" ? (
                    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 20 20">
                      <path
                        d="M3 5h14M3 10h14M3 15h14"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.6"
                      />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 20 20">
                      <path
                        d="M3 4h6v5H3V4Zm8 0h6v5h-6V4ZM3 11h6v5H3v-5Zm8 0h6v5h-6v-5Z"
                        stroke="currentColor"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      />
                    </svg>
                  )}
                  <span className="hidden md:inline">{layout}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <CompactStatCard
            active={quickFilter === "at-risk"}
            label="At Risk Now"
            onClick={() =>
              setQuickFilter((current) => (current === "at-risk" ? "all" : "at-risk"))
            }
            tone="neutral"
            value={totalAtRisk}
          />
          <CompactStatCard
            active={quickFilter === "needs-contact"}
            label="Needs Contact Today"
            onClick={() =>
              setQuickFilter((current) =>
                current === "needs-contact" ? "all" : "needs-contact",
              )
            }
            tone="amber"
            value={totalNeedsContact}
            title="Active ROs without a contact logged today."
          />
          <CompactStatCard
            active={quickFilter === "overdue"}
            label="Overdue"
            onClick={() =>
              setQuickFilter((current) => (current === "overdue" ? "all" : "overdue"))
            }
            tone="rose"
            value={totalOverdue}
          />
          <CompactStatCard
            active={quickFilter === "all"}
            label="Total Active"
            onClick={() => setQuickFilter("all")}
            tone="blue"
            value={repairOrders.length}
          />
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
          <span className="ml-auto text-xs text-zinc-500">
            Showing{" "}
            <span className="font-mono font-semibold text-zinc-900">
              {filteredRepairOrders.length}
            </span>{" "}
            of <span className="font-mono text-zinc-700">{repairOrders.length}</span>
          </span>
          <button
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md bg-transparent px-2.5 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-transparent transition hover:bg-zinc-100 disabled:opacity-50"
            disabled={!filtersAreActive}
            onClick={() => {
              setQuickFilter("all");
              setSearch("");
            }}
            type="button"
          >
            <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 20 20">
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
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Advisor ROs</h2>
          </div>
          <div className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700">
            {filteredRepairOrders.length} {boardLayout === "cards" ? "cards" : "rows"}
          </div>
        </div>
        {filteredRepairOrders.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-600">
            No cards match the current filters.
          </div>
        ) : boardLayout === "cards" ? (
          <div className="mt-5 grid gap-5">
            {filteredRepairOrders.map((repairOrder) => (
              <AdvisorContactCard key={repairOrder.roNumber} repairOrder={repairOrder} />
            ))}
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200">
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-[0.08em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">RO</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Vehicle</th>
                  <th className="px-3 py-2 font-medium">Tech</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                  <th className="px-3 py-2 font-medium">Last Contact</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredRepairOrders.map((repairOrder) => {
                  const blocker = repairOrder.blockerState;
                  const contactedToday = hasRepairOrderContactToday(repairOrder);
                  const dueDate = blocker?.techPromisedDate ?? repairOrder.promisedAtNormalized;
                  const latestContact = repairOrder.contactRecords[0] ?? null;

                  return (
                    <tr
                      className="bg-white transition hover:bg-zinc-50"
                      key={repairOrder.roNumber}
                    >
                      <td className="px-3 py-3 align-middle">
                        <span className="font-mono text-sm font-semibold text-zinc-900">
                          {repairOrder.roNumber}
                        </span>
                        <p className="mt-0.5 text-xs text-zinc-500">Tag {repairOrder.tag || "N/A"}</p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <p className="font-medium text-zinc-900">{repairOrder.customerName}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{repairOrder.phone || "No phone"}</p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <p className="text-zinc-900">
                          {repairOrder.year} {repairOrder.model}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">{repairOrder.mode}</p>
                      </td>
                      <td className="px-3 py-3 align-middle text-zinc-700">
                        {repairOrder.techNumber !== null
                          ? `Tech ${repairOrder.techNumber}`
                          : "Unassigned"}
                        {repairOrder.techName ? (
                          <p className="mt-0.5 text-xs text-zinc-500">{repairOrder.techName}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={cn(
                              "rounded-md px-2 py-1 text-xs font-medium",
                              contactedToday
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-900",
                            )}
                          >
                            {contactedToday ? "Contacted" : "Needs Contact"}
                          </span>
                          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                            {blocker ? blockerReasonLabels[blocker.blockerReason] : "No blocker"}
                          </span>
                          {repairOrder.repairValue ? (
                            <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white">
                              {repairValueLabels[repairOrder.repairValue]}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle text-zinc-700">
                        {formatDateTime(dueDate)}
                      </td>
                      <td className="px-3 py-3 align-middle text-zinc-700">
                        {latestContact ? formatDateTime(latestContact.contactedAt) : "No contact"}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold text-zinc-800">
                          {repairOrder.priorityScore}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
