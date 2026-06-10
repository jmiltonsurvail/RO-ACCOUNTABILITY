import { type ReactNode } from "react";

export function CollapsibleSection({
  children,
  defaultOpen = false,
  meta,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  meta?: ReactNode;
  title: string;
}) {
  return (
    <details
      className="group rounded-lg border border-zinc-200 bg-white open:pb-4"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">{title}</span>
        <span className="flex items-center gap-2">
          {meta ? (
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
              {meta}
            </span>
          ) : null}
          <span className="text-sm text-zinc-400 transition group-open:rotate-180">v</span>
        </span>
      </summary>
      <div className="border-t border-zinc-100 px-4 pt-4">{children}</div>
    </details>
  );
}
