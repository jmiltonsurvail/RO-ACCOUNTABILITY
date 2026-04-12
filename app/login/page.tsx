import { redirect } from "next/navigation";
import { getServerAuthSession, resolveAuthenticatedPath } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await getServerAuthSession();

  if (session?.user) {
    redirect(
      resolveAuthenticatedPath({
        organizationId: session.user.organizationId,
        role: session.user.role,
      }),
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#144a74_0%,#09111a_55%,#06090d_100%)] px-6 py-16">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-black/40">
        <LoginForm />
      </section>
    </main>
  );
}
