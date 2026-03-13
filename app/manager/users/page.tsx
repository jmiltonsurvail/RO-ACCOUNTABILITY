import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { UserAdminForm } from "@/components/user-admin-form";
import { UserAdminTable } from "@/components/user-admin-table";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ManagerUsersPage() {
  const session = await requireRole([Role.MANAGER]);
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }, { email: "asc" }],
    select: {
      active: true,
      asmNumber: true,
      createdAt: true,
      email: true,
      id: true,
      name: true,
      role: true,
    },
  });

  return (
    <AppShell
      currentPath="/manager/users"
      session={session}
      subtitle="Create user logins for each role. Advisors need an ASM number so their board filters correctly."
      title="User Admin"
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <UserAdminForm />

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Existing users</h2>
            <p className="mt-2 text-sm text-slate-500">
              Expand a row to edit profile details, activate/deactivate, or reset that user&apos;s password.
            </p>
          </div>

          <div className="mt-6">
            <UserAdminTable
              currentManagerId={session.user.id}
              users={users.map((user) => ({
                active: user.active,
                asmNumber: user.asmNumber,
                createdAt: user.createdAt.toISOString(),
                email: user.email,
                id: user.id,
                name: user.name,
                role: user.role,
              }))}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
