import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { CompactStatCard } from "@/components/compact-stat-card";
import { ReportSection } from "@/components/report-section";
import { getManagerAlertCount } from "@/lib/alerts";
import { getServerAuthSession, requireOrganizationId, requireRole } from "@/lib/auth";
import {
  getManagerReportsData,
  type ManagerReportRange,
} from "@/lib/data";
import { roleLabels } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";

type ReportFocus =
  | "all"
  | "active"
  | "blocked"
  | "overdue"
  | "needs-contact"
  | "blocker-updates"
  | "contact-updates";

const reportRangeOptions: Array<{ label: string; value: ManagerReportRange }> = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "All Time", value: "all" },
];

function formatPercent(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return `${value}%`;
}

function formatHours(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return `${value.toFixed(1)}h`;
}

function normalizeReportFocus(value: string | undefined): ReportFocus {
  if (
    value === "active" ||
    value === "blocked" ||
    value === "overdue" ||
    value === "needs-contact" ||
    value === "blocker-updates" ||
    value === "contact-updates"
  ) {
    return value;
  }

  return "all";
}

function buildReportHref(range: ManagerReportRange, focus: ReportFocus) {
  const params = new URLSearchParams({ range });

  if (focus !== "all") {
    params.set("focus", focus);
  }

  return `/manager/reports?${params.toString()}`;
}

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; range?: string }>;
}) {
  const scopedSession = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(scopedSession);
  const params = await searchParams;
  const [session, reports, managerAlertCount] = await Promise.all([
    getServerAuthSession(),
    getManagerReportsData(organizationId, params.range),
    getManagerAlertCount(organizationId),
  ]);
  const focus = normalizeReportFocus(params.focus);

  const filteredTechRows = reports.techRows.filter((row) => {
    if (focus === "all" || focus === "active") {
      return true;
    }

    if (focus === "blocked") {
      return row.blockedCount > 0;
    }

    if (focus === "overdue") {
      return row.overdueCount > 0;
    }

    if (focus === "needs-contact") {
      return row.needsContactCount > 0;
    }

    return false;
  });

  const filteredAdvisorRows = reports.advisorRows.filter((row) => {
    if (focus === "all" || focus === "active") {
      return true;
    }

    if (focus === "blocked") {
      return row.blockedCount > 0;
    }

    if (focus === "overdue") {
      return row.overdueCount > 0;
    }

    if (focus === "needs-contact") {
      return row.notContactedTodayCount > 0;
    }

    if (focus === "contact-updates") {
      return row.recentContactUpdates > 0;
    }

    return false;
  });

  const filteredDispatcherRows = reports.dispatcherRows.filter((row) => {
    if (focus === "all" || focus === "active") {
      return true;
    }

    if (focus === "blocked") {
      return row.currentBlockedOwned > 0 || row.blockerUpdates > 0 || row.blockerClears > 0;
    }

    if (focus === "blocker-updates") {
      return row.blockerUpdates > 0 || row.blockerClears > 0;
    }

    if (focus === "contact-updates") {
      return row.contactUpdates > 0 || row.contactResets > 0;
    }

    return false;
  });

  const showTechSection =
    focus === "all" ||
    focus === "active" ||
    focus === "blocked" ||
    focus === "overdue" ||
    focus === "needs-contact";
  const showAdvisorSection =
    focus === "all" ||
    focus === "active" ||
    focus === "blocked" ||
    focus === "overdue" ||
    focus === "needs-contact" ||
    focus === "contact-updates";
  const showDispatcherSection =
    focus === "all" ||
    focus === "active" ||
    focus === "blocked" ||
    focus === "blocker-updates" ||
    focus === "contact-updates";

  return (
    <AppShell
      currentPath="/manager/reports"
      managerAlertCount={managerAlertCount}
      session={session!}
      subtitle=""
      title="Reports"
    >
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Report Window</h2>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
            Generated {formatDateTime(reports.generatedAt)}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {reportRangeOptions.map((option) => (
            <Link
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition",
                reports.range === option.value
                  ? "border-cyan-400 bg-cyan-50 text-cyan-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-slate-950",
              )}
              href={`/manager/reports?range=${option.value}`}
              key={option.value}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <CompactStatCard
            active={focus === "all" || focus === "active"}
            href={buildReportHref(reports.range, "active")}
            label="Active"
            tone="bg-slate-950 text-white"
            value={reports.summary.activeRepairOrders}
          />
          <CompactStatCard
            active={focus === "blocked"}
            href={buildReportHref(reports.range, "blocked")}
            label="Blocked"
            tone="bg-amber-100 text-amber-900"
            value={reports.summary.activeBlocked}
          />
          <CompactStatCard
            active={focus === "overdue"}
            href={buildReportHref(reports.range, "overdue")}
            label="Overdue"
            tone="bg-rose-100 text-rose-800"
            value={reports.summary.activeOverdue}
          />
          <CompactStatCard
            active={focus === "needs-contact"}
            href={buildReportHref(reports.range, "needs-contact")}
            label="Needs Contact Today"
            tone="bg-cyan-100 text-cyan-950"
            value={reports.summary.needsContact}
            title="Active ROs without a contact logged today."
          />
          <CompactStatCard
            active={focus === "blocker-updates"}
            href={buildReportHref(reports.range, "blocker-updates")}
            label={`${reports.rangeLabel} Blocker Updates`}
            tone="bg-slate-100 text-slate-900"
            value={reports.summary.periodBlockerUpdates}
          />
          <CompactStatCard
            active={focus === "contact-updates"}
            href={buildReportHref(reports.range, "contact-updates")}
            label={`${reports.rangeLabel} Contact Updates`}
            tone="bg-emerald-100 text-emerald-900"
            value={reports.summary.periodContactUpdates}
          />
        </div>
        {focus !== "all" ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p>
              Showing report rows for <span className="font-semibold">{focus.replace(/-/g, " ")}</span>.
            </p>
            <Link
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-slate-950"
              href={buildReportHref(reports.range, "all")}
            >
              Clear Filter
            </Link>
          </div>
        ) : null}
      </section>

      <div className="mt-6 grid gap-6">
        {showTechSection ? (
        <ReportSection
            description="Live workload by technician based on the currently active repair-order set."
            title="Tech Report"
          >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-3 pr-4 font-semibold">Tech</th>
                  <th className="pb-3 pr-4 font-semibold">Active ROs</th>
                  <th className="pb-3 pr-4 font-semibold">Blocked</th>
                  <th className="pb-3 pr-4 font-semibold">Overdue</th>
                  <th className="pb-3 pr-4 font-semibold">Needs Contact</th>
                  <th className="pb-3 font-semibold">Avg Blocked</th>
                </tr>
              </thead>
              <tbody>
                {filteredTechRows.map((row) => (
                  <tr className="border-b border-slate-100 last:border-b-0" key={row.key}>
                    <td className="py-3 pr-4">
                      <div>
                        <p className="font-medium text-slate-950">{row.displayName}</p>
                        <p className="text-xs text-slate-500">
                          {row.techNumber !== null ? `Tech ${row.techNumber}` : "Unassigned"}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 pr-4">{row.activeAssigned}</td>
                    <td className="py-3 pr-4">{row.blockedCount}</td>
                    <td className="py-3 pr-4">{row.overdueCount}</td>
                    <td className="py-3 pr-4">{row.needsContactCount}</td>
                    <td className="py-3">{formatHours(row.avgBlockedHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTechRows.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No tech rows match this filter.</p>
            ) : null}
          </div>
        </ReportSection>
        ) : null}

        {showAdvisorSection ? (
        <ReportSection
            description="Advisor accountability based on active repair orders and recent contact updates."
            title="Advisor Report"
          >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-3 pr-4 font-semibold">Advisor</th>
                  <th className="pb-3 pr-4 font-semibold">Active ROs</th>
                  <th className="pb-3 pr-4 font-semibold">Blocked</th>
                  <th className="pb-3 pr-4 font-semibold">Contacted Today</th>
                  <th className="pb-3 pr-4 font-semibold">Needs Contact Today</th>
                  <th className="pb-3 pr-4 font-semibold">Overdue</th>
                  <th className="pb-3 pr-4 font-semibold">Contact Rate</th>
                  <th className="pb-3 font-semibold">{reports.rangeLabel} Updates</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdvisorRows.map((row) => (
                  <tr className="border-b border-slate-100 last:border-b-0" key={row.asmNumber}>
                    <td className="py-3 pr-4">
                      <div>
                        <p className="font-medium text-slate-950">{row.advisorName}</p>
                        <p className="text-xs text-slate-500">
                          ASM {row.asmNumber}
                          {row.advisorName ? ` · ${row.advisorName}` : ""}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 pr-4">{row.activeAssigned}</td>
                    <td className="py-3 pr-4">{row.blockedCount}</td>
                    <td className="py-3 pr-4">{row.contactedTodayCount}</td>
                    <td className="py-3 pr-4">{row.notContactedTodayCount}</td>
                    <td className="py-3 pr-4">{row.overdueCount}</td>
                    <td className="py-3 pr-4">{formatPercent(row.contactRate)}</td>
                    <td className="py-3">{row.recentContactUpdates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAdvisorRows.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No advisor rows match this filter.</p>
            ) : null}
          </div>
        </ReportSection>
        ) : null}

        {showDispatcherSection ? (
        <ReportSection
            description={`Blocker and contact actions recorded during ${reports.rangeLabel.toLowerCase()}.`}
            title="Dispatcher Report"
          >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-3 pr-4 font-semibold">User</th>
                  <th className="pb-3 pr-4 font-semibold">Role</th>
                  <th className="pb-3 pr-4 font-semibold">Blocker Updates</th>
                  <th className="pb-3 pr-4 font-semibold">Clears</th>
                  <th className="pb-3 pr-4 font-semibold">Contact Resets</th>
                  <th className="pb-3 pr-4 font-semibold">Contact Updates</th>
                  <th className="pb-3 font-semibold">Current Blocked Owned</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispatcherRows.map((row) => (
                  <tr className="border-b border-slate-100 last:border-b-0" key={row.userId}>
                    <td className="py-3 pr-4 font-medium text-slate-950">{row.displayName}</td>
                    <td className="py-3 pr-4">{roleLabels[row.role]}</td>
                    <td className="py-3 pr-4">{row.blockerUpdates}</td>
                    <td className="py-3 pr-4">{row.blockerClears}</td>
                    <td className="py-3 pr-4">{row.contactResets}</td>
                    <td className="py-3 pr-4">{row.contactUpdates}</td>
                    <td className="py-3">{row.currentBlockedOwned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDispatcherRows.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No dispatcher rows match this filter.</p>
            ) : null}
          </div>
        </ReportSection>
        ) : null}
      </div>
    </AppShell>
  );
}
