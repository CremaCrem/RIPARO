// no React import needed with modern JSX transform

export type ReportStatus =
  | "pending"
  | "in_review"
  | "assigned"
  | "resolved"
  | "rejected";

type TimelineItem = {
  key: ReportStatus;
  label: string;
  at?: string; // ISO date string
};

export default function ReportTimeline({
  status,
  dates = {},
}: {
  status: ReportStatus;
  dates?: Partial<Record<ReportStatus, string>>;
}) {
  const order: TimelineItem[] = [
    { key: "pending", label: "Pending" },
    { key: "in_review", label: "In review" },
    { key: "assigned", label: "Assigned" },
    { key: "resolved", label: "Resolved" },
    { key: "rejected", label: "Rejected" },
  ];

  const currentIndex = order.findIndex((s) => s.key === status);

  return (
    <div className="relative">
      <ol className="space-y-4">
        {order.map((step, idx) => {
          const isPast = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const color = isCurrent
            ? "bg-[#0038A8]"
            : isPast
            ? "bg-emerald-600"
            : "bg-slate-300";
          return (
            <li key={step.key} className="flex items-start gap-3">
              <span
                className={`mt-1 inline-block h-3 w-3 rounded-full ${color}`}
              />
              <div>
                <div
                  className={`text-sm ${
                    isCurrent
                      ? "font-semibold text-slate-800"
                      : isPast
                      ? "text-slate-700"
                      : "text-slate-500"
                  }`}
                >
                  {step.label}
                </div>
                {dates[step.key] && (
                  <div className="text-xs text-slate-500">
                    {new Date(dates[step.key] as string).toLocaleString()}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
