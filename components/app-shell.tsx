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
  managerAlertCount?: number;
  session: Session;
  subtitle: string;
  subtitleMode?: "inline" | "tooltip";
  title: string;
};

const navByRole: Record<
  Role,
  Array<{
    href: string;
    icon: "alerts" | "board" | "dispatch" | "reports" | "import" | "settings" | "users";
    label: string;
    matchPaths?: string[];
    shortLabel: string;
  }>
> = {
  ADVISOR: [{ href: "/advisor", icon: "board", label: "Advisor Board", shortLabel: "AB" }],
  DISPATCHER: [{ href: "/dispatcher", icon: "dispatch", label: "Dispatcher", shortLabel: "DP" }],
  MANAGER: [
    { href: "/manager", icon: "board", label: "Dashboard", shortLabel: "DB" },
    { href: "/manager/alerts", icon: "alerts", label: "Alerts", shortLabel: "AL" },
    { href: "/manager/reports", icon: "reports", label: "Reports", shortLabel: "RP" },
    { href: "/dispatcher", icon: "dispatch", label: "Dispatcher", shortLabel: "DP" },
    { href: "/manager/import", icon: "import", label: "Daily Import", shortLabel: "DI" },
    {
      href: "/manager/settings",
      icon: "settings",
      label: "Settings",
      matchPaths: [
        "/manager/settings",
        "/manager/settings/alerts",
        "/manager/settings/integrations",
        "/manager/settings/integrations/goto-connect",
        "/manager/settings/sla",
        "/manager/users",
      ],
      shortLabel: "ST",
    },
  ],
  SERVICE_SYNCNOW_ADMIN: [
    {
      href: "/servicesyncnow-admin",
      icon: "users",
      label: "Organizations",
      shortLabel: "OR",
    },
    {
      href: "/servicesyncnow-admin/integrations",
      icon: "settings",
      label: "Integrations",
      shortLabel: "IN",
    },
  ],
  TECH: [],
};

function NavIcon({
  name,
}: {
  name: "alerts" | "board" | "dispatch" | "reports" | "import" | "settings" | "users";
}) {
  if (name === "alerts") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <path
          d="M10 3.75a4 4 0 0 0-4 4v2.11c0 .5-.16.98-.45 1.39l-.93 1.3c-.28.4.01.95.51.95h9.74c.5 0 .79-.55.5-.95l-.92-1.3a2.4 2.4 0 0 1-.45-1.39V7.75a4 4 0 0 0-4-4Zm-1.75 11.5a1.75 1.75 0 0 0 3.5 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

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

  if (name === "settings") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <path
          d="M10 7.1a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Zm7 2.9-.98-.56.07-1.13-1.44-.58-.39-1.06-1.51-.04-.67-.94-1.44.43-1.08-.35-.98.86-1.16.04-.57 1.13-1.08.43-.04 1.17-.9.58.35 1.12-.43 1.05.78.86.04 1.17 1.08.43.57 1.13 1.16.04.98.86 1.08-.35 1.44.43.67-.94 1.51-.04.39-1.06 1.44-.58-.07-1.13.98-.56-.35-1.12.43-1.05-.78-.86-.04-1.17-1.08-.43-.57-1.13-1.16-.04-.98-.86-1.08.35-1.44-.43-.67.94-1.51.04-.39 1.06-1.44.58.07 1.13-.98.56.35 1.12-.43 1.05.78.86.04 1.17 1.08.43.57 1.13 1.16.04.98.86 1.08-.35 1.44.43.67-.94 1.51-.04.39-1.06 1.44-.58-.07-1.13.98-.56-.35-1.12.43-1.05-.78-.86-.04-1.17-1.08-.43-.57-1.13-1.16-.04-.98-.86-1.08.35-1.44-.43-.67.94-1.51.04-.39 1.06-1.44.58.07 1.13-.98.56"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
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
  managerAlertCount = 0,
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
  const navItems = navByRole[session.user.role];

  return (
    <div
      className={cn(
        "bg-[var(--background)] text-zinc-900",
        fullHeight ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
    >
      <header className="sticky top-0 z-30 border-b border-stone-300/70 bg-[var(--page-bg-soft)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[120rem] items-center gap-4 px-4 py-2.5 sm:px-5">
          <Link className="flex shrink-0 items-center gap-2.5" href={navItems[0]?.href ?? "/"}>
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-zinc-900 font-mono text-[11px] font-bold text-white">
              RO
            </span>
            <span className="hidden whitespace-nowrap md:block">
              <span className="block text-sm font-semibold tracking-tight text-zinc-900">
                {APP_NAME}
              </span>
              <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                {roleLabels[session.user.role]}
              </span>
            </span>
          </Link>

          <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = item.matchPaths
                ? item.matchPaths.includes(currentPath)
                : currentPath === item.href;

              return (
                <Link
                  key={item.href}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-white text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                  href={item.href}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.icon === "alerts" && managerAlertCount > 0 ? (
                    <span className="ml-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                      {managerAlertCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-md bg-zinc-50 px-2.5 py-1 text-xs text-zinc-500 ring-1 ring-inset ring-zinc-200 lg:flex">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Auto-refresh · 15s
            </div>
            <div className="relative">
              <button
                className="inline-flex h-8 items-center gap-2 rounded-md bg-white px-1.5 pr-2.5 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50"
                onClick={() => setAccountMenuOpen((current) => !current)}
                type="button"
              >
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-700">
                  {avatarLabel}
                </span>
                <span className="hidden max-w-28 truncate text-sm text-zinc-900 md:inline">
                  {displayName.split(" ")[0]}
                </span>
              </button>
              {accountMenuOpen ? (
                <div className="absolute right-0 top-full z-40 mt-1.5 w-64 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-zinc-200">
                  <div className="border-b border-zinc-100 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex size-9 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-700">
                        {avatarLabel}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">{displayName}</p>
                        <p className="truncate text-xs text-zinc-500">{session.user.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700">
                      {roleLabels[session.user.role]}
                    </div>
                  </div>
                  <div className="flex justify-end px-4 py-3">
                    <LogoutButton />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto w-full max-w-[120rem] px-4 py-5 sm:px-5",
          fullHeight ? "flex h-[calc(100dvh-3.375rem)] min-h-0 flex-col" : "min-h-[calc(100vh-3.375rem)]",
        )}
      >
        <div
          className={cn(
            "relative z-0 min-w-0 flex-1",
            fullHeight ? "flex min-h-0 h-full flex-col overflow-hidden" : "",
          )}
        >
          <header className="mb-5 px-1 text-zinc-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold">{title}</h1>
                  {subtitleMode === "tooltip" && subtitle ? (
                    <div className="group relative">
                      <button
                        className="inline-flex size-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-950 focus-visible:border-zinc-900 focus-visible:text-zinc-950"
                        title={subtitle}
                        type="button"
                      >
                        i
                      </button>
                      <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-72 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-xl group-hover:block group-focus-within:block">
                        {subtitle}
                      </div>
                    </div>
                  ) : null}
                </div>
                {subtitleMode === "inline" && subtitle ? (
                  <p className="mt-2 max-w-3xl text-sm text-zinc-600">{subtitle}</p>
                ) : null}
              </div>
            </div>
          </header>
          <main
            className={cn(
              "w-full",
              fullHeight ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "",
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
