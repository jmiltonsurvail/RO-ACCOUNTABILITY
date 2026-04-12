import Link from "next/link";
import { Role } from "@prisma/client";
import { AddOrganizationManagerForm } from "@/components/add-organization-manager-form";
import { AppShell } from "@/components/app-shell";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { EditOrganizationForm } from "@/components/edit-organization-form";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ServiceSyncNowAdminPage() {
  const session = await requireRole([Role.SERVICE_SYNCNOW_ADMIN]);
  const organizations = await prisma.organization.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      active: true,
      createdAt: true,
      id: true,
      name: true,
      slug: true,
      users: {
        orderBy: [{ createdAt: "asc" }],
        select: {
          createdAt: true,
          email: true,
          name: true,
          role: true,
        },
        where: {
          role: Role.MANAGER,
        },
      },
      _count: {
        select: {
          importBatches: true,
          repairOrders: true,
          users: true,
        },
      },
    },
  });

  return (
    <AppShell
      currentPath="/servicesyncnow-admin"
      session={session}
      subtitle=""
      title="ServiceSyncNow Admin"
    >
      <section className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-5">
          <Link
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
            href="/servicesyncnow-admin/integrations"
          >
            <h2 className="text-2xl font-semibold text-slate-950">Platform Integrations</h2>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Global S3 and OpenAI settings
            </p>
            <p className="mt-5 text-sm font-semibold text-slate-900">Open</p>
          </Link>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">Create Organization</h2>
            <div className="mt-6">
              <CreateOrganizationForm />
            </div>
          </section>
        </div>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Organizations</h2>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {organizations.length} total
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {organizations.map((organization) => {
              const firstManager = organization.users[0] ?? null;
              const managerCount = organization.users.length;

              return (
                <article
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
                  key={organization.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {organization.name}
                        </h3>
                        <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                          {organization.slug}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        First manager:{" "}
                        {firstManager
                          ? `${firstManager.name?.trim() || firstManager.email} (${firstManager.email})`
                          : "Not provisioned"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Managers: {managerCount}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        Created {new Date(organization.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        organization.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {organization.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Users
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">
                        {organization._count.users}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Repair Orders
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">
                        {organization._count.repairOrders}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Imports
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">
                        {organization._count.importBatches}
                      </p>
                    </div>
                  </div>

                  <EditOrganizationForm
                    organizationId={organization.id}
                    organizationName={organization.name}
                    organizationSlug={organization.slug}
                  />
                  <AddOrganizationManagerForm organizationId={organization.id} />
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
