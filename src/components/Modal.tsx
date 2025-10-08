import React from "react";

export default function Modal({
  title,
  actions,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  actions: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
}) {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className={`relative w-full ${sizeClasses[size]} rounded-xl border border-slate-200 bg-white p-5 shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-base font-semibold text-slate-800">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0038A8]" />
              {title}
            </span>
          </h3>
          <button
            className="text-slate-500 hover:text-[#0038A8]"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-3 text-sm text-slate-700">{children}</div>
        <div className="mt-4 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}
