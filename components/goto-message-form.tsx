"use client";

import { usePathname, useSearchParams } from "next/navigation";

export function GoToMessageForm({
  compact = false,
  disabled = false,
  roNumber,
}: {
  compact?: boolean;
  disabled?: boolean;
  roNumber: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.delete("gotoCallMessage");
  returnToParams.delete("gotoCallRo");
  returnToParams.delete("gotoCallStatus");
  returnToParams.set("openRo", String(roNumber));
  const returnTo =
    returnToParams.size > 0 ? `${pathname}?${returnToParams.toString()}` : pathname;

  return (
    <form action="/api/goto-connect/message" className="grid gap-2" method="post">
      <input name="ro" type="hidden" value={roNumber} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="block">
        <span className="sr-only">Text message</span>
        <textarea
          className={`w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 ${
            compact ? "min-h-20" : "min-h-24"
          }`}
          disabled={disabled}
          maxLength={1000}
          name="message"
          placeholder="Write a customer text message..."
          required
        />
      </label>
      <div className="flex justify-end">
        <button
          className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          disabled={disabled}
          type="submit"
        >
          Send Text
        </button>
      </div>
    </form>
  );
}
