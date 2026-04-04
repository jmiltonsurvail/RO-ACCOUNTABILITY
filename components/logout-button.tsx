"use client";

import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      className={cn(
        "border border-white/15 text-slate-300 transition hover:border-cyan-400/60 hover:text-white",
        compact
          ? "rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
          : "rounded-full px-4 py-2 text-sm",
      )}
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      {compact ? "Out" : "Sign out"}
    </button>
  );
}
