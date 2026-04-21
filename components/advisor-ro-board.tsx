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
import type { SlaSettingsValues } from "@/lib/sla-settings";

type AdvisorQuickFilter = "all" | "at-risk" | "needs-contact" | "overdue";

export function AdvisorRoBoard({
  repairOrders,
  slaSettings,
}: {
  repairOrders: AdvisorRepairOrder[];
  slaSettings: SlaSettingsValues;
}) {
  const [quickFilter, setQuickFilter] = useState<AdvisorQuickFilter>("all");
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
    <div className="grid gap-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)_auto] lg:items-start">
          <label className="block">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="RO, tag, customer, model, phone, tech"
              value={search}
            />
          </label>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Advisor Workload</h2>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
            Showing {filteredRepairOrders.length} of {repairOrders.length}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <CompactStatCard
            active={quickFilter === "at-risk"}
            label="At Risk Now"
            onClick={() =>
              setQuickFilter((current) => (current === "at-risk" ? "all" : "at-risk"))
            }
            tone="bg-slate-950 text-white"
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
            tone="bg-amber-100 text-amber-900"
            value={totalNeedsContact}
            title="Active ROs without a contact logged today."
          />
          <CompactStatCard
            active={quickFilter === "overdue"}
            label="Overdue"
            onClick={() =>
              setQuickFilter((current) => (current === "overdue" ? "all" : "overdue"))
            }
            tone="bg-rose-100 text-rose-800"
            value={totalOverdue}
          />
          <CompactStatCard
            active={quickFilter === "all"}
            label="Total Active"
            onClick={() => setQuickFilter("all")}
            tone="bg-cyan-100 text-cyan-900"
            value={repairOrders.length}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-cyan-400 hover:text-slate-950 disabled:opacity-50"
            disabled={!filtersAreActive}
            onClick={() => {
              setQuickFilter("all");
              setSearch("");
            }}
            type="button"
          >
            Reset Filters
          </button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Advisor ROs</h2>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
            {filteredRepairOrders.length} cards
          </div>
        </div>
        {filteredRepairOrders.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
            No cards match the current filters.
          </div>
        ) : (
          <div className="mt-5 grid gap-5">
            {filteredRepairOrders.map((repairOrder) => (
              <AdvisorContactCard key={repairOrder.roNumber} repairOrder={repairOrder} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
