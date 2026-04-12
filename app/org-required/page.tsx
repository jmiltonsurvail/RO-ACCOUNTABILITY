import { LogoutButton } from "@/components/logout-button";
import { requireSession } from "@/lib/auth";

export default async function OrgRequiredPage() {
  const session = await requireSession();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#144a74_0%,#09111a_55%,#06090d_100%)] px-6 py-16">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 text-white shadow-2xl shadow-black/40">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
          Account Setup Required
        </p>
        <h1 className="mt-4 text-3xl font-semibold">No organization is assigned to this user.</h1>
        <p className="mt-4 text-sm text-slate-300">
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
