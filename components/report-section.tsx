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
      className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      open={open}
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
            {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            {open ? "Close" : "Open"}
          </span>
        </div>
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}
