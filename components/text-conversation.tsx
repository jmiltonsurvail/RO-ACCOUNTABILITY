"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoToMessageForm } from "@/components/goto-message-form";
import {
  TextMessageThread,
  type TextMessageThreadEntry,
} from "@/components/text-message-thread";

export function TextConversation({
  compact = false,
  initialMessages,
  initialUnreadCount,
  phone,
  roNumber,
}: {
  compact?: boolean;
  initialMessages: TextMessageThreadEntry[];
  initialUnreadCount: number;
  phone: string;
  roNumber: number;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const latestMessageId = messages[messages.length - 1]?.id ?? null;
  const hasUnread = unreadCount > 0;

  const refreshMessages = useCallback(async () => {
    const response = await fetch(`/api/repair-orders/${roNumber}/text-messages`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as {
      messages?: TextMessageThreadEntry[];
      unreadCount?: number;
    };

    setMessages(payload.messages ?? []);
    setUnreadCount(payload.unreadCount ?? 0);
  }, [roNumber]);

  useEffect(() => {
    setMessages(initialMessages);
    setUnreadCount(initialUnreadCount);
  }, [initialMessages, initialUnreadCount]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshMessages();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [refreshMessages]);

  const latestInboundUnread = useMemo(
    () =>
      messages
        .slice()
        .reverse()
        .find((message) => message.direction === "INBOUND" && !message.readAt),
    [messages],
  );

  async function markRead() {
    setIsMarkingRead(true);

    try {
      await fetch(`/api/repair-orders/${roNumber}/text-messages`, {
        body: JSON.stringify({ action: "mark-read" }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      await refreshMessages();
    } finally {
      setIsMarkingRead(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            RO Conversation
          </p>
          <p className="mt-1 text-xs text-zinc-500">{phone}</p>
        </div>
        {hasUnread ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">
              {unreadCount} unread
            </span>
            <button
              className="rounded-md border border-amber-300 px-2 py-1 text-[11px] font-semibold text-amber-900 transition hover:border-amber-500"
              disabled={isMarkingRead}
              onClick={markRead}
              type="button"
            >
              {isMarkingRead ? "Marking..." : "Mark Read"}
            </button>
          </div>
        ) : null}
      </div>
      {latestInboundUnread ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          New customer message waiting.
        </p>
      ) : null}
      <TextMessageThread latestMessageId={latestMessageId} messages={messages} />
      <GoToMessageForm compact={compact} onSent={refreshMessages} roNumber={roNumber} />
    </div>
  );
}
