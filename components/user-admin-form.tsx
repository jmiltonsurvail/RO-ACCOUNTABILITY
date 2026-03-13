"use client";

import { Role } from "@prisma/client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserAction,
  type UserAdminActionState,
} from "@/app/manager/users/actions";

const initialState: UserAdminActionState = {};

export function UserAdminForm() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>(Role.DISPATCHER);
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form
      action={formAction}
      className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Add user</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create logins for dispatchers, advisors, and other managers.
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            name="name"
            placeholder="Jane Smith"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            name="email"
            placeholder="jane@getscw.com"
            required
            type="email"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              name="role"
              onChange={(event) => setSelectedRole(event.target.value as Role)}
              value={selectedRole}
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
              disabled={selectedRole !== Role.ADVISOR}
              name="asmNumber"
              placeholder={selectedRole === Role.ADVISOR ? "785" : "Not used"}
              required={selectedRole === Role.ADVISOR}
              type="number"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Temporary password
          </span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            minLength={8}
            name="password"
            placeholder="At least 8 characters"
            required
            type="password"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
          <input className="size-4" defaultChecked name="active" type="checkbox" />
          User is active
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <button
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            {pending ? "Creating..." : "Create User"}
          </button>
          {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
          {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
        </div>
      </div>
    </form>
  );
}
