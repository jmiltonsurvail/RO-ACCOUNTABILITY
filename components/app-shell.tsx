import Link from "next/link";
import type { Session } from "next-auth";
import { Role } from "@prisma/client";
import { APP_NAME, roleLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

type AppShellProps = {
  children: React.ReactNode;
  currentPath: string;
  fullHeight?: boolean;
  session: Session;
  title: string;
  subtitle: string;
};

const navByRole: Record<Role, Array<{ href: string; label: string }>> = {
  ADVISOR: [{ href: "/advisor", label: "Advisor Board" }],
  DISPATCHER: [{ href: "/dispatcher", label: "Dispatcher" }],
  MANAGER: [
    { href: "/manager", label: "Dashboard" },
    { href: "/manager/reports", label: "Reports" },
    { href: "/dispatcher", label: "Dispatcher" },
    { href: "/manager/import", label: "Daily Import" },
    { href: "/manager/users", label: "Users" },
  ],
  TECH: [],
};

export function AppShell({
  children,
  currentPath,
  fullHeight = false,
  session,
  subtitle,
  title,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "bg-[radial-gradient(circle_at_top,#15324b_0%,rgba(21,50,75,0.55)_22%,transparent_45%),linear-gradient(180deg,#071018_0%,#0a1724_38%,#0d1f31_100%)]",
        fullHeight ? "flex h-dvh min-h-0 flex-col overflow-hidden" : "min-h-screen",
      )}
    >
      <header
        className={cn(
          "border-b border-white/10 bg-slate-950/80 px-6 py-5 text-white backdrop-blur",
          fullHeight && "shrink-0",
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
              {APP_NAME}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{title}</h1>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
                {roleLabels[session.user.role]}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{subtitle}</p>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <nav className="flex flex-wrap gap-2">
              {navByRole[session.user.role].map((item) => (
                <Link
                  key={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition",
                    currentPath === item.href
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-white/10 text-slate-300 hover:border-cyan-400/40 hover:text-white",
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {session.user.name ?? session.user.email}
                </p>
                <p className="text-xs text-slate-400">{session.user.email}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>
      <main
        className={cn(
          "mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6",
          fullHeight
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "py-8",
        )}
      >
        {children}
      </main>
    </div>
  );
}
