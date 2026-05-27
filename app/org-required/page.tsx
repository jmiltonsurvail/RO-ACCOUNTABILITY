import { LogoutButton } from "@/components/logout-button";
import { requireSession } from "@/lib/auth";

export default async function OrgRequiredPage() {
  const session = await requireSession();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-16 text-zinc-900">
      <section className="auth-surface w-full max-w-xl rounded-xl border border-[var(--surface-border)] bg-[var(--card-bg)] p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Account Setup Required
        </p>
        <h1 className="mt-4 text-3xl font-semibold">No organization is assigned to this user.</h1>
        <p className="mt-4 text-sm text-zinc-600">
          {session.user.email} authenticated successfully, but the account is not linked to a
          tenant org yet. A ServiceSyncNow admin needs to provision the org or move this user into
          the correct company.
        </p>
        <div className="mt-8 flex justify-end">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
