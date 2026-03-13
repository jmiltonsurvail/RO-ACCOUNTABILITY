"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/60 hover:text-white"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sign out
    </button>
  );
}
