"use client";

import { useRef, useState, type FormEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function GoToMessageForm({
  compact = false,
  disabled = false,
  onSent,
  roNumber,
}: {
  compact?: boolean;
  disabled?: boolean;
  onSent?: () => void;
  roNumber: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    status: "error" | "success";
  } | null>(null);
  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.delete("gotoCallMessage");
  returnToParams.delete("gotoCallRo");
  returnToParams.delete("gotoCallStatus");
  returnToParams.set("openRo", String(roNumber));
  const returnTo =
    returnToParams.size > 0 ? `${pathname}?${returnToParams.toString()}` : pathname;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || isSending) {
      return;
    }

    setIsSending(true);
    setFeedback(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/goto-connect/message", {
        body: formData,
        headers: {
          Accept: "application/json",
          "X-Requested-With": "fetch",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        status?: "error" | "success";
      } | null;

      if (!response.ok || payload?.status !== "success") {
        setFeedback({
          message: payload?.message ?? "Unable to send text message.",
          status: "error",
        });
        return;
      }

      formRef.current?.reset();
      setFeedback({
        message: payload.message ?? "Text message sent.",
        status: "success",
      });
      onSent?.();
    } catch {
      setFeedback({
        message: "Unable to send text message.",
        status: "error",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form
      action="/api/goto-connect/message"
      className="grid gap-2"
      method="post"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <input name="ro" type="hidden" value={roNumber} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="block">
        <span className="sr-only">Text message</span>
        <textarea
          className={`w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 ${
            compact ? "min-h-20" : "min-h-24"
          }`}
          disabled={disabled || isSending}
          maxLength={1000}
          name="message"
          placeholder="Write a customer text message..."
          required
        />
      </label>
      {feedback ? (
        <p
          className={`rounded-md px-3 py-2 text-xs ${
            feedback.status === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <button
          className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          disabled={disabled || isSending}
          type="submit"
        >
          {isSending ? "Sending..." : "Send Text"}
        </button>
      </div>
    </form>
  );
}
