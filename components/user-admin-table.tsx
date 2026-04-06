"use client";

import { Role } from "@prisma/client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  resetUserPasswordAction,
  type UserAdminActionState,
  updateUserAction,
} from "@/app/manager/users/actions";
import { CompactStatCard } from "@/components/compact-stat-card";
import { roleLabels } from "@/lib/constants";

type UserRow = {
  active: boolean;
  asmNumber: number | null;
  createdAt: string;
  email: string;
  id: string;
  name: string | null;
  role: Role;
  techNumber: number | null;
};

const initialState: UserAdminActionState = {};

type ActivityFilter = "ALL" | "ACTIVE" | "INACTIVE";
type ProfileFilter = "ALL" | "NAMED" | "MISSING_NAME";
type UserQuickFilter = "ALL" | "ACTIVE" | "INACTIVE" | "MISSING_NAME";

type UserGroup = {
  description: string;
  key: string;
  title: string;
  users: UserRow[];
};

function getUserDisplayName(user: UserRow) {
  return user.name?.trim() || "Needs Name";
}

function getStaffBadge(user: UserRow) {
  if (user.role === Role.ADVISOR) {
    return `ASM ${user.asmNumber ?? "N/A"}`;
  }

  if (user.role === Role.TECH) {
    return `Tech ${user.techNumber ?? "N/A"}`;
  }

  return "Staff";
}

function buildUserGroups(users: UserRow[]) {
  const groups: UserGroup[] = [
    {
      description: "Current login-enabled accounts.",
      key: "active-users",
      title: "Active Users",
      users: users.filter((user) => user.active),
    },
    {
      description: "ASM placeholders that still need a profile.",
      key: "inactive-advisors",
      title: "Inactive Advisors",
      users: users.filter((user) => !user.active && user.role === Role.ADVISOR),
    },
    {
      description: "Tech placeholders that still need a profile.",
      key: "inactive-techs",
      title: "Inactive Techs",
      users: users.filter((user) => !user.active && user.role === Role.TECH),
    },
    {
      description: "Other inactive non-placeholder accounts.",
      key: "inactive-other",
      title: "Other Inactive Users",
      users: users.filter(
        (user) =>
          !user.active &&
          user.role !== Role.ADVISOR &&
          user.role !== Role.TECH,
      ),
    },
  ];

  return groups.filter((group) => group.users.length > 0);
}

function UserEditorRow({
  currentManagerId,
  user,
}: {
  currentManagerId: string;
  user: UserRow;
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>(user.role);
  const [updateState, updateAction, updatePending] = useActionState(
    updateUserAction,
    initialState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    resetUserPasswordAction,
    initialState,
  );

  useEffect(() => {
    if (updateState.success || passwordState.success) {
      router.refresh();
    }
  }, [passwordState.success, router, updateState.success]);

  const isCurrentManager = user.id === currentManagerId;
  const showAsmField = selectedRole === Role.ADVISOR;
  const showTechField = selectedRole === Role.TECH;
  const staffBadge = getStaffBadge(user);
  const isPlaceholder = !user.active && (user.role === Role.ADVISOR || user.role === Role.TECH);
  const displayName = getUserDisplayName(user);
  const createdDate = new Date(user.createdAt).toLocaleDateString();

  return (
    <details className="rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-950">{displayName}</p>
              {!user.name?.trim() ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Needs Name
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-slate-600">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">
                {roleLabels[user.role]}
              </span>
              <span className="rounded-full border border-slate-300 px-2.5 py-1 text-slate-600">
                {staffBadge}
              </span>
              <span className="rounded-full border border-slate-300 px-2.5 py-1 text-slate-600">
                Added {createdDate}
              </span>
              {isPlaceholder ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-700">
                  Placeholder
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[11px] uppercase tracking-[0.15em]">
            <span
              className={`rounded-full px-2.5 py-1 ${
                user.active
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {user.active ? "Active" : "Inactive"}
            </span>
            <span className="rounded-full border border-slate-300 px-2.5 py-1 text-slate-600">
              Edit
            </span>
          </div>
        </div>
      </summary>

      <div className="grid gap-5 border-t border-slate-200 bg-white p-5 lg:grid-cols-[1.2fr_0.8fr]">
        <form action={updateAction} className="grid gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Profile
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Update the user&apos;s identity, role, and staff-number mapping.
            </p>
          </div>
          <input name="userId" type="hidden" value={user.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                defaultValue={user.name ?? ""}
                name="name"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                defaultValue={user.email}
                name="email"
                required
                type="email"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                defaultValue={user.role}
                name="role"
                onChange={(event) => setSelectedRole(event.target.value as Role)}
              >
                <option value={Role.DISPATCHER}>Dispatcher</option>
                <option value={Role.ADVISOR}>Advisor</option>
                <option value={Role.TECH}>Tech</option>
                <option value={Role.MANAGER}>Manager</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                ASM Number
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                defaultValue={user.asmNumber ?? ""}
                disabled={!showAsmField}
                name="asmNumber"
                placeholder={showAsmField ? "785" : "Not used"}
                required={showAsmField}
                type="number"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Tech Number
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                defaultValue={user.techNumber ?? ""}
                disabled={!showTechField}
                name="techNumber"
                placeholder={showTechField ? "416" : "Not used"}
                required={showTechField}
                type="number"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              className="size-4"
              defaultChecked={user.active}
              disabled={isCurrentManager}
              name="active"
              type="checkbox"
            />
            {isCurrentManager
              ? "Your account must stay active"
              : "User is active"}
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <button
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              disabled={updatePending}
              type="submit"
            >
              {updatePending ? "Saving..." : "Save Changes"}
            </button>
            {updateState.success ? (
              <p className="text-sm text-emerald-700">{updateState.success}</p>
            ) : null}
            {updateState.error ? (
              <p className="text-sm text-rose-600">{updateState.error}</p>
            ) : null}
          </div>
        </form>

        <form action={passwordAction} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <input name="userId" type="hidden" value={user.id} />
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Reset Password
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Set a new temporary password for this user.
          </p>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              New password
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              minLength={8}
              name="password"
              placeholder="At least 8 characters"
              required
              type="password"
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-cyan-400 hover:text-slate-950 disabled:opacity-50"
              disabled={passwordPending}
              type="submit"
            >
              {passwordPending ? "Resetting..." : "Reset Password"}
            </button>
            {passwordState.success ? (
              <p className="text-sm text-emerald-700">{passwordState.success}</p>
            ) : null}
            {passwordState.error ? (
              <p className="text-sm text-rose-600">{passwordState.error}</p>
            ) : null}
          </div>
        </form>
      </div>
    </details>
  );
}

export function UserAdminTable({
  addUserSlot,
  currentManagerId,
  users,
}: {
  addUserSlot?: React.ReactNode;
  currentManagerId: string;
  users: UserRow[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("ALL");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("ALL");

  if (users.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        No users yet.
      </div>
    );
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const baseFilteredUsers = users.filter((user) => {
    const matchesSearch =
      normalizedQuery.length === 0 ||
      [
        user.name ?? "",
        user.email,
        user.role,
        roleLabels[user.role],
        user.asmNumber?.toString() ?? "",
        user.techNumber?.toString() ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });
  const filteredUsers = baseFilteredUsers.filter((user) => {
    const matchesActivity =
      activityFilter === "ALL" ||
      (activityFilter === "ACTIVE" ? user.active : !user.active);
    const matchesProfile =
      profileFilter === "ALL" ||
      (profileFilter === "NAMED" ? Boolean(user.name?.trim()) : !user.name?.trim());

    return matchesActivity && matchesProfile;
  });
  const groupedUsers = buildUserGroups(filteredUsers);
  const allCount = baseFilteredUsers.length;
  const needsNameCount = baseFilteredUsers.filter((user) => !user.name?.trim()).length;
  const activeCount = baseFilteredUsers.filter((user) => user.active).length;
  const inactiveCount = allCount - activeCount;
  const quickFilter: UserQuickFilter =
    activityFilter === "ACTIVE"
      ? "ACTIVE"
      : activityFilter === "INACTIVE"
        ? "INACTIVE"
        : profileFilter === "MISSING_NAME"
          ? "MISSING_NAME"
          : "ALL";
  const quickFilterCards = [
    {
      count: allCount,
      key: "ALL" as const,
      label: "All Users",
      tone: "bg-slate-950 text-white",
    },
    {
      count: activeCount,
      key: "ACTIVE" as const,
      label: "Active",
      tone: "bg-emerald-100 text-emerald-800",
    },
    {
      count: inactiveCount,
      key: "INACTIVE" as const,
      label: "Inactive",
      tone: "bg-slate-200 text-slate-700",
    },
    {
      count: needsNameCount,
      key: "MISSING_NAME" as const,
      label: "Need Name",
      tone: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <div className="grid h-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <div className="shrink-0 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Search
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Name, email, ASM, tech number"
              type="search"
              value={searchQuery}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Role
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              onChange={(event) => setRoleFilter(event.target.value as "ALL" | Role)}
              value={roleFilter}
            >
              <option value="ALL">All Roles</option>
              <option value={Role.MANAGER}>{roleLabels[Role.MANAGER]}</option>
              <option value={Role.DISPATCHER}>{roleLabels[Role.DISPATCHER]}</option>
              <option value={Role.ADVISOR}>{roleLabels[Role.ADVISOR]}</option>
              <option value={Role.TECH}>{roleLabels[Role.TECH]}</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Status
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              onChange={(event) =>
                setActivityFilter(event.target.value as ActivityFilter)
              }
              value={activityFilter}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Profile
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              onChange={(event) =>
                setProfileFilter(event.target.value as ProfileFilter)
              }
              value={profileFilter}
            >
              <option value="ALL">All Profiles</option>
              <option value="NAMED">Named</option>
              <option value="MISSING_NAME">Needs Name</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {quickFilterCards.map((card) => (
              <CompactStatCard
                active={quickFilter === card.key}
                key={card.key}
                label={card.label}
                onClick={() => {
                  if (card.key === "ALL") {
                    setActivityFilter("ALL");
                    setProfileFilter("ALL");
                    return;
                  }

                  if (card.key === "ACTIVE") {
                    setActivityFilter("ACTIVE");
                    setProfileFilter("ALL");
                    return;
                  }

                  if (card.key === "INACTIVE") {
                    setActivityFilter("INACTIVE");
                    setProfileFilter("ALL");
                    return;
                  }

                  setActivityFilter("ALL");
                  setProfileFilter("MISSING_NAME");
                }}
                tone={card.tone}
                value={card.count}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {addUserSlot}
            {searchQuery || roleFilter !== "ALL" || activityFilter !== "ALL" || profileFilter !== "ALL" ? (
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("ALL");
                  setActivityFilter("ALL");
                  setProfileFilter("ALL");
                }}
                type="button"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/60 p-2">
        <div className="h-full overflow-y-auto pr-2">
          {groupedUsers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No users match the current search and filters.
            </div>
          ) : (
            <div className="space-y-5">
              {groupedUsers.map((group) => (
                <section
                  className="rounded-3xl border border-slate-200 bg-white/70 p-3"
                  key={group.key}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2 px-1">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        {group.title}
                      </h3>
                      <p className="text-xs text-slate-500">{group.description}</p>
                    </div>
                    <span className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                      {group.users.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {group.users.map((user) => (
                      <UserEditorRow
                        currentManagerId={currentManagerId}
                        key={user.id}
                        user={user}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
