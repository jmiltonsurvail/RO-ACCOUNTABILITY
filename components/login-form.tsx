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
        <span className="mb-2 block text-sm font-medium text-zinc-700">Email</span>
        <input
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          name="email"
          placeholder="manager@example.com"
          required
          type="email"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-zinc-700">Password</span>
        <input
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <button
        className="h-11 w-full rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
