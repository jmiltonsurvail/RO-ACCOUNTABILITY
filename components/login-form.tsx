"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");
        setError(null);

        startTransition(async () => {
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (result?.error) {
            setError("Email or password is invalid.");
            return;
          }

          router.replace("/");
          router.refresh();
        });
      }}
    >
      <label className="block">
        <span className="mb-2 block text-sm text-slate-300">Email</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-slate-50 outline-none ring-0 transition focus:border-cyan-400"
          name="email"
          placeholder="manager@example.com"
          required
          type="email"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm text-slate-300">Password</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-slate-50 outline-none ring-0 transition focus:border-cyan-400"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      {error ? (
        <p className="rounded-2xl border border-rose-400/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      <button
        className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
