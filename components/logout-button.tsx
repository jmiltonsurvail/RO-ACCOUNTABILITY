"use client";

import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      className={cn(
        "border border-zinc-300 bg-white text-zinc-800 transition hover:border-zinc-900 hover:text-zinc-950",
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
