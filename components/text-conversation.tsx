"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoToMessageForm } from "@/components/goto-message-form";
import {
  buildRepairOrderPhoneOptions,
  type RepairOrderContactPhoneEntry,
  type RepairOrderPhoneOption,
} from "@/components/repair-order-phone-manager";
import {
  TextMessageThread,
  type TextMessageThreadEntry,
} from "@/components/text-message-thread";

export function TextConversation({
  compact = false,
  contactPhones,
  initialMessages,
  phone,
  roNumber,
}: {
  compact?: boolean;
  contactPhones: RepairOrderContactPhoneEntry[];
  initialMessages: TextMessageThreadEntry[];
  phone: string | null;
  roNumber: number;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const phoneOptions = useMemo(
    () => buildRepairOrderPhoneOptions({ contactPhones, primaryPhone: phone }),
    [contactPhones, phone],
  );
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState(
    phoneOptions[0]?.phoneNumber ?? phone ?? "",
  );

  const selectedPhone: RepairOrderPhoneOption | null =
    phoneOptions.find((option) => option.phoneNumber === selectedPhoneNumber) ??
    phoneOptions[0] ??
    null;
  const visibleMessages = selectedPhone?.phoneNumber
    ? messages.filter(
        (message) =>
          message.contactPhoneNumber === selectedPhone.phoneNumber ||
          (!message.contactPhoneNumber && selectedPhone.isPrimary),
      )
    : messages;
  const visibleUnreadCount = visibleMessages.filter(
    (message) => message.direction === "INBOUND" && !message.readAt,
  ).length;
  const latestMessageId = visibleMessages[visibleMessages.length - 1]?.id ?? null;
  const hasUnread = visibleUnreadCount > 0;

  const refreshMessages = useCallback(async () => {
    const url = new URL(`/api/repair-orders/${roNumber}/text-messages`, window.location.origin);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as {
      messages?: TextMessageThreadEntry[];
    };

    setMessages(payload.messages ?? []);
  }, [roNumber]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    void refreshMessages();
  }, [refreshMessages]);

  useEffect(() => {
    if (!phoneOptions.some((option) => option.phoneNumber === selectedPhoneNumber)) {
      setSelectedPhoneNumber(phoneOptions[0]?.phoneNumber ?? phone ?? "");
    }
  }, [phone, phoneOptions, selectedPhoneNumber]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshMessages();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [refreshMessages]);

  const latestInboundUnread = useMemo(
    () =>
      visibleMessages
        .slice()
        .reverse()
        .find((message) => message.direction === "INBOUND" && !message.readAt),
    [visibleMessages],
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
          <p className="mt-1 text-xs text-zinc-500">
            {selectedPhone?.phoneNumber ?? phone ?? "No phone selected"}
          </p>
        </div>
        {hasUnread ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">
              {visibleUnreadCount} unread
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
      {phoneOptions.length > 1 ? (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Contact number</span>
          <select
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            onChange={(event) => setSelectedPhoneNumber(event.target.value)}
            value={selectedPhone?.phoneNumber ?? ""}
          >
            {phoneOptions.map((option) => (
              <option key={option.id} value={option.phoneNumber}>
                {option.label}: {option.phoneNumber}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {latestInboundUnread ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          New customer message waiting.
        </p>
      ) : null}
      <TextMessageThread latestMessageId={latestMessageId} messages={visibleMessages} />
      <GoToMessageForm
        compact={compact}
        contactPhoneNumber={selectedPhone?.phoneNumber ?? phone}
        onSent={refreshMessages}
        roNumber={roNumber}
      />
    </div>
  );
}
