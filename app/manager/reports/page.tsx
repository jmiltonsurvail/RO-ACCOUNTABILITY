import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { getServerAuthSession, requireRole } from "@/lib/auth";
import {
  getManagerReportsData,
  type ManagerReportRange,
} from "@/lib/data";
import { roleLabels } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";

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

function SummaryCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: number;
}) {
  return (
    <div className={cn("rounded-[1.5rem] p-5 shadow-sm", tone)}>
      <p className="text-xs uppercase tracking-[0.2em] opacity-80">{label}</p>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function SectionHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireRole([Role.MANAGER]);
  const session = await getServerAuthSession();
  const params = await searchParams;
  const reports = await getManagerReportsData(params.range);

  return (
    <AppShell
      currentPath="/manager/reports"
      session={session!}
      subtitle="Review live workload and accountability trends across techs, advisors, and dispatch coverage."
      title="Reports"
    >
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Report Window</h2>
            <p className="mt-2 text-sm text-slate-500">
              Current workload metrics are live. Dispatcher action counts use the selected time
              window.
            </p>
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Active ROs"
            tone="bg-slate-950 text-white"
            value={reports.summary.activeRepairOrders}
          />
          <SummaryCard
            label="Blocked"
            tone="bg-amber-100 text-amber-900"
            value={reports.summary.activeBlocked}
          />
          <SummaryCard
            label="Overdue"
            tone="bg-rose-100 text-rose-800"
            value={reports.summary.activeOverdue}
          />
          <SummaryCard
            label="Needs Contact"
            tone="bg-cyan-100 text-cyan-950"
            value={reports.summary.needsContact}
          />
          <SummaryCard
            label={`${reports.rangeLabel} Blocker Updates`}
            tone="bg-slate-100 text-slate-900"
            value={reports.summary.periodBlockerUpdates}
          />
          <SummaryCard
            label={`${reports.rangeLabel} Contact Updates`}
            tone="bg-emerald-100 text-emerald-900"
            value={reports.summary.periodContactUpdates}
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            description="Live workload by technician based on the currently active repair-order set."
            title="Tech Report"
          />

          <div className="mt-5 overflow-x-auto">
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
                {reports.techRows.map((row) => (
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
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            description="Advisor accountability based on active repair orders and recent contact updates."
            title="Advisor Report"
          />

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-3 pr-4 font-semibold">Advisor</th>
                  <th className="pb-3 pr-4 font-semibold">Active ROs</th>
                  <th className="pb-3 pr-4 font-semibold">Blocked</th>
                  <th className="pb-3 pr-4 font-semibold">Contacted</th>
                  <th className="pb-3 pr-4 font-semibold">Needs Contact</th>
                  <th className="pb-3 pr-4 font-semibold">Overdue</th>
                  <th className="pb-3 pr-4 font-semibold">Contact Rate</th>
                  <th className="pb-3 font-semibold">{reports.rangeLabel} Updates</th>
                </tr>
              </thead>
              <tbody>
                {reports.advisorRows.map((row) => (
                  <tr className="border-b border-slate-100 last:border-b-0" key={row.asmNumber}>
                    <td className="py-3 pr-4">
                      <div>
                        <p className="font-medium text-slate-950">{row.advisorName}</p>
                        <p className="text-xs text-slate-500">ASM {row.asmNumber}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4">{row.activeAssigned}</td>
                    <td className="py-3 pr-4">{row.blockedCount}</td>
                    <td className="py-3 pr-4">{row.contactedBlockedCount}</td>
                    <td className="py-3 pr-4">{row.notContactedBlockedCount}</td>
                    <td className="py-3 pr-4">{row.overdueCount}</td>
                    <td className="py-3 pr-4">{formatPercent(row.contactRate)}</td>
                    <td className="py-3">{row.recentContactUpdates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            description={`Blocker and contact actions recorded during ${reports.rangeLabel.toLowerCase()}.`}
            title="Dispatcher Report"
          />

          <div className="mt-5 overflow-x-auto">
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
                {reports.dispatcherRows.map((row) => (
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
          </div>
        </section>
      </div>
    </AppShell>
  );
}
