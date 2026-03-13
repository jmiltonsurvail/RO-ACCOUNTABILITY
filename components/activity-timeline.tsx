import { blockerReasonLabels } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

type ActivityTimelineProps = {
  activities: Array<{
    createdAt: Date;
    id: string;
    message: string;
    metadata: unknown;
    user: {
      email: string;
      name: string | null;
    } | null;
  }>;
};

function renderMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const record = metadata as Record<string, unknown>;

  if (typeof record.blockerReason === "string") {
    const label =
      blockerReasonLabels[
        record.blockerReason as keyof typeof blockerReasonLabels
      ] ?? record.blockerReason;
    return <span className="text-xs text-slate-500">Reason: {label}</span>;
  }

  if (typeof record.promisedRaw === "string") {
    return (
      <span className="text-xs text-slate-500">Promised: {record.promisedRaw}</span>
    );
  }

  return null;
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return <p className="text-sm text-slate-500">No audit activity yet.</p>;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-900">{activity.message}</p>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {formatDateTime(activity.createdAt)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {activity.user ? (
              <span className="text-xs text-slate-500">
                {activity.user.name ?? activity.user.email}
              </span>
            ) : null}
            {renderMetadata(activity.metadata)}
          </div>
        </div>
      ))}
    </div>
  );
}
