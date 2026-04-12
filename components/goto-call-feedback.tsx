"use client";

import { useSearchParams } from "next/navigation";

export function GoToCallFeedback({
  roNumber,
}: {
  roNumber: number;
}) {
  const searchParams = useSearchParams();
  const feedbackRo = searchParams.get("gotoCallRo");
  const status = searchParams.get("gotoCallStatus");
  const message = searchParams.get("gotoCallMessage");

  if (!message || !status || feedbackRo !== String(roNumber)) {
    return null;
  }

  const tone =
    status === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      {message}
    </p>
  );
}
