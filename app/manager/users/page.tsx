import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { UserAdminForm } from "@/components/user-admin-form";
import { UserAdminTable } from "@/components/user-admin-table";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function syncImportedStaffPlaceholders() {
  const [advisorRepairOrders, techRepairOrders, existingUsers] = await Promise.all([
    prisma.repairOrder.findMany({
      where: { isActive: true },
      select: {
        advisorName: true,
        asmNumber: true,
      },
    }),
    prisma.repairOrder.findMany({
      where: {
        isActive: true,
        techNumber: { not: null },
      },
      select: {
        techName: true,
        techNumber: true,
      },
    }),
    prisma.user.findMany({
      select: {
        asmNumber: true,
        role: true,
        techNumber: true,
      },
      where: {
        role: {
          in: [Role.ADVISOR, Role.TECH],
        },
      },
    }),
  ]);

  const existingAdvisorNumbers = new Set(
    existingUsers
      .filter((user) => user.role === Role.ADVISOR && user.asmNumber !== null)
      .map((user) => user.asmNumber as number),
  );
  const existingTechNumbers = new Set(
    existingUsers
      .filter((user) => user.role === Role.TECH && user.techNumber !== null)
      .map((user) => user.techNumber as number),
  );

  const advisorMap = new Map<number, string | null>();
  advisorRepairOrders.forEach((repairOrder) => {
    if (!advisorMap.has(repairOrder.asmNumber)) {
      advisorMap.set(repairOrder.asmNumber, repairOrder.advisorName);
      return;
    }

    if (!advisorMap.get(repairOrder.asmNumber) && repairOrder.advisorName) {
      advisorMap.set(repairOrder.asmNumber, repairOrder.advisorName);
    }
  });

  const techMap = new Map<number, string | null>();
  techRepairOrders.forEach((repairOrder) => {
    if (!repairOrder.techNumber) {
      return;
    }

    if (!techMap.has(repairOrder.techNumber)) {
      techMap.set(repairOrder.techNumber, repairOrder.techName);
      return;
    }

    if (!techMap.get(repairOrder.techNumber) && repairOrder.techName) {
      techMap.set(repairOrder.techNumber, repairOrder.techName);
    }
  });

  const missingAdvisors = Array.from(advisorMap.entries()).filter(
    ([asmNumber]) => !existingAdvisorNumbers.has(asmNumber),
  );
  const missingTechs = Array.from(techMap.entries()).filter(
    ([techNumber]) => !existingTechNumbers.has(techNumber),
  );

  if (missingAdvisors.length === 0 && missingTechs.length === 0) {
    return;
  }

  const placeholderPasswordHash = await hash("inactive-placeholder-account", 12);

  await prisma.user.createMany({
    data: [
      ...missingAdvisors.map(([asmNumber, name]) => ({
        active: false,
        asmNumber,
        email: `advisor-${asmNumber}@placeholder.local`,
        name,
        passwordHash: placeholderPasswordHash,
        role: Role.ADVISOR,
        techNumber: null,
      })),
      ...missingTechs.map(([techNumber, name]) => ({
        active: false,
        asmNumber: null,
        email: `tech-${techNumber}@placeholder.local`,
        name,
        passwordHash: placeholderPasswordHash,
        role: Role.TECH,
        techNumber,
      })),
    ],
    skipDuplicates: true,
  });
}

export default async function ManagerUsersPage() {
  const session = await requireRole([Role.MANAGER]);
  await syncImportedStaffPlaceholders();
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
      techNumber: true,
    },
  });

  return (
    <AppShell
      currentPath="/manager/users"
      fullHeight
      session={session}
      subtitle="Create user logins and manage imported staff placeholders. Advisors need an ASM number, and tech roster entries use a tech number."
      title="User Admin"
    >
      <section className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Users</h2>
            <p className="mt-2 text-sm text-slate-500">
              Imported advisor and tech numbers appear here as inactive placeholders when no matching user exists yet. Expand a row to add names, update profile details, activate/deactivate, or reset that user&apos;s password.
            </p>
          </div>

          <details className="w-full max-w-xl rounded-3xl border border-slate-200 bg-slate-50 md:w-auto">
            <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-slate-900">
              Add User
            </summary>
            <div className="border-t border-slate-200 p-5">
              <UserAdminForm />
            </div>
          </details>
        </div>

        <div className="mt-6 min-h-0 flex-1 overflow-hidden">
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
              techNumber: user.techNumber,
            }))}
          />
        </div>
      </section>
    </AppShell>
  );
}
