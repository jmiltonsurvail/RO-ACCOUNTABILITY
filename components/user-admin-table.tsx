"use client";

import { Role } from "@prisma/client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  resetUserPasswordAction,
  type UserAdminActionState,
  updateUserAction,
} from "@/app/manager/users/actions";

type UserRow = {
  active: boolean;
  asmNumber: number | null;
  createdAt: string;
  email: string;
  id: string;
  name: string | null;
  role: Role;
};

const initialState: UserAdminActionState = {};

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

  return (
    <details className="rounded-3xl border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer list-none px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-slate-950">
              {user.name || "Unnamed User"}
            </p>
            <p className="text-sm text-slate-600">{user.email}</p>
            <p className="text-xs text-slate-400">
              Added {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.15em]">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-white">{user.role}</span>
            <span className="rounded-full border border-slate-300 px-3 py-1 text-slate-600">
              ASM {user.asmNumber ?? "N/A"}
            </span>
            <span
              className={`rounded-full px-3 py-1 ${
                user.active
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {user.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </summary>

      <div className="grid gap-5 border-t border-slate-200 bg-white p-5 lg:grid-cols-[1.2fr_0.8fr]">
        <form action={updateAction} className="grid gap-4">
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
                disabled={selectedRole !== Role.ADVISOR}
                name="asmNumber"
                placeholder={selectedRole === Role.ADVISOR ? "785" : "Not used"}
                required={selectedRole === Role.ADVISOR}
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
  currentManagerId,
  users,
}: {
  currentManagerId: string;
  users: UserRow[];
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        No users yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <UserEditorRow
          currentManagerId={currentManagerId}
          key={user.id}
          user={user}
        />
      ))}
    </div>
  );
}
