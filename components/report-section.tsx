"use client";

import { useState } from "react";

export function ReportSection({
  children,
  defaultOpen = true,
  description,
  title,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  description: string;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className="ro-card rounded-lg border border-zinc-200 bg-white p-5"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      open={open}
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
            {description ? <p className="mt-2 text-sm text-zinc-500">{description}</p> : null}
          </div>
          <span className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600">
            {open ? "Close" : "Open"}
          </span>
        </div>
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}
