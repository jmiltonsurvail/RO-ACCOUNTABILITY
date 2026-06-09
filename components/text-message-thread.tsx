"use client";

import { useEffect, useRef } from "react";
import { formatDateTime } from "@/lib/utils";

export type TextMessageThreadEntry = {
  advisorLabel: string | null;
  body: string | null;
  deliveryStatus: string | null;
  direction: "INBOUND" | "OUTBOUND";
  id: string;
  readAt: string | null;
  sentAt: string;
};

export function TextMessageThread({
  latestMessageId,
  messages,
}: {
  latestMessageId?: string | null;
  messages: TextMessageThreadEntry[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      behavior: "smooth",
      top: scrollRef.current.scrollHeight,
    });
  }, [latestMessageId]);

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-5 text-sm text-zinc-500">
        No text messages logged yet.
      </div>
    );
  }

  return (
    <div
      className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3"
      ref={scrollRef}
    >
      {messages.map((message) => {
        const outbound = message.direction === "OUTBOUND";

        return (
          <div
            className={`flex ${outbound ? "justify-end" : "justify-start"}`}
            key={message.id}
          >
            <div
              className={`max-w-[82%] rounded-lg px-3 py-2 text-sm ${
                outbound
                  ? "bg-zinc-900 text-white"
                  : message.readAt
                    ? "border border-zinc-200 bg-zinc-50 text-zinc-800"
                    : "border border-amber-200 bg-amber-50 text-zinc-900"
              }`}
            >
              <p className="whitespace-pre-wrap leading-6">
                {message.body || "Message body unavailable."}
              </p>
              <div
                className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] ${
                  outbound ? "text-zinc-300" : "text-zinc-500"
                }`}
              >
                <span>{outbound ? message.advisorLabel || "Advisor" : "Customer"}</span>
                <span>{formatDateTime(message.sentAt)}</span>
                {message.deliveryStatus ? <span>{message.deliveryStatus}</span> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
