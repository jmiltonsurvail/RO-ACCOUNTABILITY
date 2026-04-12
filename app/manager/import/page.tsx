import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { ImportForm } from "@/components/import-form";
import { getManagerAlertCount } from "@/lib/alerts";
import { getServerAuthSession, requireOrganizationId, requireRole } from "@/lib/auth";
import { getRecentImportBatch } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export default async function ManagerImportPage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>;
}) {
  const scopedSession = await requireRole([Role.MANAGER]);
  const organizationId = requireOrganizationId(scopedSession);
  const params = await searchParams;
  const [session, latestBatch, managerAlertCount] = await Promise.all([
    getServerAuthSession(),
    getRecentImportBatch(organizationId, params.batchId),
    getManagerAlertCount(organizationId),
  ]);

  return (
    <AppShell
      currentPath="/manager/import"
      managerAlertCount={managerAlertCount}
      session={session!}
      subtitle=""
      title="Daily Import"
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <ImportForm />
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Latest Import</h2>
          {latestBatch ? (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                  <p className="mt-3 text-xl font-semibold text-slate-950">{latestBatch.status}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Imported</p>
                  <p className="mt-3 text-xl font-semibold text-slate-950">
                    {latestBatch.importedRowCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Skipped</p>
                  <p className="mt-3 text-xl font-semibold text-slate-950">
                    {latestBatch.skippedRowCount}
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{latestBatch.sourceFileName}</p>
                <p className="mt-1">Uploaded by {latestBatch.uploadedBy.name ?? latestBatch.uploadedBy.email}</p>
                <p className="mt-1">Started {formatDateTime(latestBatch.createdAt)}</p>
                <p className="mt-1">Completed {formatDateTime(latestBatch.completedAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Skipped rows
                </p>
                <div className="mt-3 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                  {latestBatch.rowErrors.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      No rows were skipped in this import.
                    </div>
                  ) : (
                    latestBatch.rowErrors.map((rowError) => (
                      <div
                        key={rowError.id}
                        className="rounded-2xl border border-rose-200 bg-rose-50 p-4"
                      >
                        <p className="text-sm font-medium text-rose-900">
                          Row {rowError.rowNumber}
                          {rowError.roNumber ? ` · RO ${rowError.roNumber}` : ""}
                        </p>
                        <p className="mt-2 text-sm text-rose-700">{rowError.reason}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">No imports yet.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
