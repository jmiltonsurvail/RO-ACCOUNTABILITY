"use client";

import Link from "next/link";
import { useState } from "react";
import type { Session } from "next-auth";
import { Role } from "@prisma/client";
import { LogoutButton } from "@/components/logout-button";
import { APP_NAME, roleLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  currentPath: string;
  fullHeight?: boolean;
  session: Session;
  subtitle: string;
  subtitleMode?: "inline" | "tooltip";
  title: string;
};

const navByRole: Record<
  Role,
  Array<{
    href: string;
    icon: "board" | "dispatch" | "reports" | "import" | "users";
    label: string;
    shortLabel: string;
  }>
> = {
  ADVISOR: [{ href: "/advisor", icon: "board", label: "Advisor Board", shortLabel: "AB" }],
  DISPATCHER: [{ href: "/dispatcher", icon: "dispatch", label: "Dispatcher", shortLabel: "DP" }],
  MANAGER: [
    { href: "/manager", icon: "board", label: "Dashboard", shortLabel: "DB" },
    { href: "/manager/reports", icon: "reports", label: "Reports", shortLabel: "RP" },
    { href: "/dispatcher", icon: "dispatch", label: "Dispatcher", shortLabel: "DP" },
    { href: "/manager/import", icon: "import", label: "Daily Import", shortLabel: "DI" },
    { href: "/manager/users", icon: "users", label: "Users", shortLabel: "US" },
  ],
  TECH: [],
};

function NavIcon({
  name,
}: {
  name: "board" | "dispatch" | "reports" | "import" | "users";
}) {
  if (name === "dispatch") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <path
          d="M4 6.5h7m-7 3h5m6.5-1.5 1.5 1.5-4.5 4.5-2-2 4.5-4.5ZM4 14.5h4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (name === "reports") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <path
          d="M3.5 15.5h13M5.5 13V9.5M10 13V5.5M14.5 13v-3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "import") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <path
          d="M10 3.5v8m0 0 3-3m-3 3-3-3M4 15.5h12"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <path
          d="M7 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3.5 16a3.5 3.5 0 0 1 7 0M11.5 16a2.75 2.75 0 0 1 5.5 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M4 4.5h5.5v5.5H4zm6.5 0H16v5.5h-5.5zM4 11h5.5v4.5H4zm6.5 0H16v4.5h-5.5z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function AppShell({
  children,
  currentPath,
  fullHeight = false,
  session,
  subtitle,
  subtitleMode = "tooltip",
  title,
}: AppShellProps) {
  const displayName = session.user.name ?? session.user.email ?? "User";
  const avatarLabel = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [trayCollapsed, setTrayCollapsed] = useState(false);
  const navItems = navByRole[session.user.role];

  return (
    <div
      className={cn(
        "bg-[radial-gradient(circle_at_top,#15324b_0%,rgba(21,50,75,0.55)_22%,transparent_45%),linear-gradient(180deg,#071018_0%,#0a1724_38%,#0d1f31_100%)]",
        fullHeight ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[96rem] gap-4 px-4 py-4 sm:px-6 sm:py-6",
          fullHeight ? "h-full min-h-0" : "min-h-screen items-start",
        )}
      >
        <aside
          className={cn(
            "relative z-20 shrink-0 rounded-[1.75rem] border border-white/10 bg-slate-950/80 text-white shadow-xl backdrop-blur transition-all duration-200",
            fullHeight ? "flex h-full min-h-0 flex-col" : "sticky top-4",
            trayCollapsed ? "w-20" : "w-72",
          )}
        >
          <div className="flex h-full min-h-0 flex-col p-3">
            <div
              className={cn(
                "flex items-start gap-3",
                trayCollapsed ? "justify-center" : "justify-between",
              )}
            >
              {trayCollapsed ? (
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  RO
                </div>
              ) : (
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
                    {APP_NAME}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{roleLabels[session.user.role]}</p>
                </div>
              )}
              <button
                className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
                onClick={() => {
                  setTrayCollapsed((current) => !current);
                  setAccountMenuOpen(false);
                }}
                type="button"
              >
                {trayCollapsed ? ">>" : "<<"}
              </button>
            </div>

            <nav className="mt-6 flex flex-1 flex-col gap-2 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  className={cn(
                    "flex items-center rounded-2xl transition",
                    trayCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3",
                    currentPath === item.href
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-white/10 text-slate-300 hover:border-cyan-400/40 hover:text-white",
                  )}
                  href={item.href}
                  title={trayCollapsed ? item.label : undefined}
                >
                  {trayCollapsed ? (
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl font-semibold uppercase tracking-[0.18em]">
                      <NavIcon name={item.icon} />
                    </span>
                  ) : null}
                  {!trayCollapsed ? (
                    <span className="text-sm font-medium">{item.label}</span>
                  ) : null}
                </Link>
              ))}
            </nav>

            <div className="relative mt-4 border-t border-white/10 pt-4">
              <div className={cn("flex", trayCollapsed ? "justify-center" : "justify-start")}>
                <button
                  className={cn(
                    "inline-flex items-center border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-400/40 hover:text-white",
                    trayCollapsed
                      ? "size-12 justify-center rounded-2xl"
                      : "gap-3 rounded-2xl px-3 py-2.5",
                  )}
                  onClick={() => setAccountMenuOpen((current) => !current)}
                  type="button"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-cyan-400/10 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    {avatarLabel}
                  </span>
                  {!trayCollapsed ? (
                    <span className="text-left">
                      <span className="block text-sm font-medium text-white">Account</span>
                    </span>
                  ) : null}
                </button>
              </div>
              {accountMenuOpen ? (
                <div
                  className={cn(
                    "absolute z-40 w-64 rounded-[1.25rem] border border-white/10 bg-slate-950 p-4 shadow-2xl",
                    trayCollapsed ? "bottom-0 left-full ml-3" : "bottom-full left-0 mb-3",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      {avatarLabel}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{displayName}</p>
                      <p className="truncate text-xs text-slate-400">{session.user.email}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <LogoutButton />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <div
          className={cn(
            "relative z-0 min-w-0 flex-1 rounded-[1.75rem] border border-white/10 bg-slate-950/35 shadow-xl backdrop-blur",
            fullHeight ? "flex min-h-0 h-full flex-col overflow-hidden" : "",
          )}
        >
          <header className="border-b border-white/10 px-6 py-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold">{title}</h1>
                  {subtitleMode === "tooltip" ? (
                    <div className="group relative">
                      <button
                        className="inline-flex size-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/60 hover:text-white focus-visible:border-cyan-400/60 focus-visible:text-white"
                        title={subtitle}
                        type="button"
                      >
                        i
                      </button>
                      <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-72 -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-200 shadow-xl group-hover:block group-focus-within:block">
                        {subtitle}
                      </div>
                    </div>
                  ) : null}
                </div>
                {subtitleMode === "inline" ? (
                  <p className="mt-2 max-w-3xl text-sm text-slate-300">{subtitle}</p>
                ) : null}
              </div>
            </div>
          </header>
          <main
            className={cn(
              "w-full px-4 py-4 sm:px-6 sm:py-6",
              fullHeight ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "py-8",
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
