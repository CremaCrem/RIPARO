import { useState } from "react";
import { resolveAssetUrl } from "../config";

export type ReportCardProps = {
  reportId: string;
  title: string;
  status: "pending" | "in_review" | "assigned" | "resolved" | "rejected";
  thumbUrl?: string;
  afterUrl?: string;
  createdAt?: string;
  meta?: string;
  resolvedByRole?: "admin" | "mayor" | "citizen" | string;
  resolvedAt?: string | null;
};

export default function ReportCard({
  reportId,
  title,
  status,
  thumbUrl,
  afterUrl,
  createdAt,
  meta,
  resolvedByRole,
  resolvedAt,
}: ReportCardProps) {
  const color =
    status === "resolved"
      ? "bg-emerald-600"
      : status === "assigned"
      ? "bg-blue-600"
      : status === "rejected"
      ? "bg-red-600"
      : "bg-orange-500"; // pending/in_review

  const statusLabel =
    status === "in_review"
      ? "In review"
      : status === "rejected"
      ? "Disapprove"
      : status.charAt(0).toUpperCase() + status.slice(1);

  const [showAfter, setShowAfter] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm text-left hover:ring-2 hover:ring-[#0038A8]/20 focus:outline-none transition-all duration-200 hover:shadow-md">
      <div className="h-1 w-full rounded-t-xl bg-[#0038A8]" />
      <div className="px-3 sm:px-5 pt-3 sm:pt-4">
        {afterUrl && (
          <div className="mb-2 flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAfter(false);
              }}
              className={`px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-lg border transition-all duration-200 ${
                !showAfter
                  ? "bg-[#0038A8] text-white border-[#0038A8] shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              Before
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAfter(true);
              }}
              className={`px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-lg border transition-all duration-200 ${
                showAfter
                  ? "bg-[#0038A8] text-white border-[#0038A8] shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              After
            </button>
          </div>
        )}
        <div
          className="h-48 sm:h-64 w-full rounded-lg bg-slate-200/80 overflow-hidden relative cursor-zoom-in"
          onClick={(e) => {
            e.stopPropagation();
            const url = showAfter && afterUrl ? afterUrl : thumbUrl;
            if (url) setLightboxUrl(resolveAssetUrl(url));
          }}
        >
          {showAfter && afterUrl ? (
            <img
              src={resolveAssetUrl(afterUrl)}
              alt="After"
              className="h-full w-full object-cover"
            />
          ) : (
            thumbUrl && (
              <img
                src={resolveAssetUrl(thumbUrl)}
                alt="Before"
                className="h-full w-full object-cover"
              />
            )
          )}
        </div>
      </div>
      <div className="px-3 sm:px-5 pb-3 sm:pb-4 text-[12px] sm:text-[13px]">
        <div
          className="text-slate-800 font-semibold truncate text-sm sm:text-base"
          title={title || reportId}
        >
          {title || reportId}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 sm:gap-2 rounded-full border border-slate-200 bg-slate-50 px-1.5 sm:px-2 py-0.5">
            <span
              className={`inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${color}`}
            />
            <span className="text-[10px] sm:text-[11px] text-slate-700">
              {statusLabel}
            </span>
          </span>
          {createdAt && (
            <span className="text-[10px] sm:text-[11px] text-slate-500 flex-shrink-0">
              {new Date(createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {status === "resolved" && resolvedByRole && (
          <div className="mt-1 text-[10px] sm:text-[11px] text-slate-500">
            Resolved by{" "}
            {resolvedByRole === "mayor"
              ? "Mayor"
              : resolvedByRole === "admin"
              ? "Admin"
              : "Staff"}
            {resolvedAt && (
              <>
                {" "}
                ·{" "}
                {new Date(resolvedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}
          </div>
        )}
        {meta && (
          <div
            className="mt-1 text-[10px] sm:text-[11px] text-slate-600 truncate"
            title={meta}
          >
            {meta}
          </div>
        )}
      </div>
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="preview"
            className="max-h-full max-w-full rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
