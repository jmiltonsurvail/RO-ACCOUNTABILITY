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
  const numberLabel = selectedRole === Role.ADVISOR ? "ASM Number" : "Tech Number";
  const numberPlaceholder = selectedRole === Role.ADVISOR ? "785" : "416";
  const showAsmField = selectedRole === Role.ADVISOR;
  const showTechField = selectedRole === Role.TECH;

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form
      action={formAction}
      className="grid gap-4"
    >
      <div className="grid gap-4">
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
              <option value={Role.TECH}>Tech</option>
              <option value={Role.MANAGER}>Manager</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {showAsmField || showTechField ? numberLabel : "Staff Number"}
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={!showAsmField}
              name="asmNumber"
              placeholder={showAsmField ? numberPlaceholder : "Not used"}
              required={showAsmField}
              type="number"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {showTechField ? numberLabel : "Tech Number"}
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={!showTechField}
              name="techNumber"
              placeholder={showTechField ? numberPlaceholder : "Not used"}
              required={showTechField}
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
