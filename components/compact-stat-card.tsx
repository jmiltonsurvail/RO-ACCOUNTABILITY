"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type CompactStatCardProps = {
  active?: boolean;
  className?: string;
  href?: string;
  label: string;
  onClick?: () => void;
  title?: string;
  tone: string;
  value: number;
};

export function CompactStatCard({
  active = false,
  className,
  href,
  label,
  onClick,
  title,
  tone,
  value,
}: CompactStatCardProps) {
  const toneName = tone.includes("rose")
    ? "rose"
    : tone.includes("amber") || tone.includes("orange")
      ? "amber"
      : tone.includes("emerald")
        ? "emerald"
        : tone.includes("blue") || tone.includes("cyan")
          ? "blue"
          : tone.includes("violet")
            ? "violet"
            : "neutral";
  const toneStyles = {
    amber: {
      dot: "bg-amber-500",
      number: "text-amber-600",
    },
    blue: {
      dot: "bg-blue-500",
      number: "text-blue-600",
    },
    emerald: {
      dot: "bg-emerald-500",
      number: "text-emerald-600",
    },
    neutral: {
      dot: "bg-zinc-300",
      number: "text-zinc-900",
    },
    rose: {
      dot: "bg-rose-500",
      number: "text-rose-600",
    },
    violet: {
      dot: "bg-violet-500",
      number: "text-violet-600",
    },
  }[toneName];
  const content = (
    <>
      <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        <span className={cn("inline-block size-1.5 shrink-0 rounded-full", toneStyles.dot)} />
        {label}
      </p>
      <p className={cn("font-mono text-2xl font-semibold tabular-nums leading-none", toneStyles.number)}>
        {value}
      </p>
    </>
  );

  const sharedClassName = cn(
    "group flex h-full w-full flex-col items-start gap-1 rounded-lg bg-white px-3 py-2.5 text-left ring-1 ring-inset transition",
    active ? "ring-2 ring-zinc-900" : "ring-zinc-200 hover:ring-zinc-300",
    className,
  );

  if (href) {
    return (
      <Link className={sharedClassName} href={href} title={title}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button className={sharedClassName} onClick={onClick} title={title} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className={sharedClassName} title={title}>
      {content}
    </div>
  );
}
