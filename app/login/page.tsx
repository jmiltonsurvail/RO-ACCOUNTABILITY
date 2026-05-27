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
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-16 text-zinc-900">
      <section className="auth-surface w-full max-w-md rounded-xl border border-[var(--surface-border)] bg-[var(--card-bg)] p-7">
        <LoginForm />
      </section>
    </main>
  );
}
