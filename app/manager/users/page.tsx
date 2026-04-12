import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { UserAdminForm } from "@/components/user-admin-form";
import { UserAdminTable } from "@/components/user-admin-table";
import { getManagerAlertCount } from "@/lib/alerts";
import { requireOrganizationId, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function syncImportedStaffPlaceholders(organizationId: string) {
  const [advisorRepairOrders, techRepairOrders, existingUsers] = await Promise.all([
    prisma.repairOrder.findMany({
      where: { isActive: true, organizationId },
      select: {
        advisorName: true,
        asmNumber: true,
      },
    }),
    prisma.repairOrder.findMany({
      where: {
        isActive: true,
        organizationId,
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
        organizationId,
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
        organizationId,
        passwordHash: placeholderPasswordHash,
        role: Role.ADVISOR,
        techNumber: null,
      })),
      ...missingTechs.map(([techNumber, name]) => ({
        active: false,
        asmNumber: null,
        email: `tech-${techNumber}@placeholder.local`,
        name,
        organizationId,
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
  const organizationId = requireOrganizationId(session);
  await syncImportedStaffPlaceholders(organizationId);
  const [users, managerAlertCount] = await Promise.all([
    prisma.user.findMany({
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
      where: {
        organizationId,
      },
    }),
    getManagerAlertCount(organizationId),
  ]);

  return (
    <AppShell
      currentPath="/manager/users"
      fullHeight
      managerAlertCount={managerAlertCount}
      session={session}
      subtitle=""
      title="User Admin"
    >
      <section className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="min-h-0 flex-1 overflow-hidden">
          <UserAdminTable
            addUserSlot={
              <details className="w-full rounded-3xl border border-slate-200 bg-white md:w-auto">
                <summary className="cursor-pointer list-none px-5 py-2.5 text-sm font-semibold text-slate-900">
                  Add User
                </summary>
                <div className="border-t border-slate-200 p-5">
                  <UserAdminForm />
                </div>
              </details>
            }
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
