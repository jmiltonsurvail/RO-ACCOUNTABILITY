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
      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-5">
          <Link
            className="ro-card rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-300"
            href="/servicesyncnow-admin/integrations"
          >
            <h2 className="text-xl font-semibold text-zinc-900">Platform Integrations</h2>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
              Global S3 and OpenAI settings
            </p>
            <p className="mt-5 text-sm font-semibold text-zinc-900">Open</p>
          </Link>

          <section className="ro-card rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-zinc-900">Create Organization</h2>
            <div className="mt-6">
              <CreateOrganizationForm />
            </div>
          </section>
        </div>

        <section className="ro-card rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">Organizations</h2>
            </div>
            <div className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white">
              {organizations.length} total
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {organizations.map((organization) => {
              const firstManager = organization.users[0] ?? null;
              const managerCount = organization.users.length;

              return (
                <article
                  className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4"
                  key={organization.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {organization.name}
                        </h3>
                        <span className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-600">
                          {organization.slug}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-600">
                        First manager:{" "}
                        {firstManager
                          ? `${firstManager.name?.trim() || firstManager.email} (${firstManager.email})`
                          : "Not provisioned"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Managers: {managerCount}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-500">
                        Created {new Date(organization.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        organization.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {organization.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md bg-white px-4 py-3 ring-1 ring-inset ring-zinc-200">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Users
                      </p>
                      <p className="mt-2 text-xl font-semibold text-zinc-900">
                        {organization._count.users}
                      </p>
                    </div>
                    <div className="rounded-md bg-white px-4 py-3 ring-1 ring-inset ring-zinc-200">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Repair Orders
                      </p>
                      <p className="mt-2 text-xl font-semibold text-zinc-900">
                        {organization._count.repairOrders}
                      </p>
                    </div>
                    <div className="rounded-md bg-white px-4 py-3 ring-1 ring-inset ring-zinc-200">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Imports
                      </p>
                      <p className="mt-2 text-xl font-semibold text-zinc-900">
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
