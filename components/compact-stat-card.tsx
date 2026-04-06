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
  const usesLightText = tone.includes("text-white");
  const content = (
    <div className="flex flex-col items-center justify-center gap-1.5">
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.14em]",
          usesLightText ? "text-white" : "opacity-75",
        )}
        style={usesLightText ? { color: "#ffffff" } : undefined}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-xl font-semibold leading-none",
          usesLightText ? "text-white" : "text-slate-950",
        )}
        style={usesLightText ? { color: "#ffffff" } : undefined}
      >
        {value}
      </p>
    </div>
  );

  const sharedClassName = cn(
    "rounded-[0.9rem] border px-2.5 py-2 text-center shadow-sm transition",
    tone,
    active ? "ring-2 ring-cyan-500 ring-offset-2" : "border-transparent hover:border-slate-300",
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
