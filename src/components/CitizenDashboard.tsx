import React, { useMemo, useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import ReportCard from "./ReportCard";
import ReportTimeline from "./ReportTimeline";

type TabKey =
  | "dashboard"
  | "submit"
  | "track"
  | "feedback"
  | "profile"
  | "help";

// API report shape
type ApiReport = {
  id: number;
  report_id: string;
  submitter_name: string;
  age: number;
  gender: string;
  address: string;
  type: string;
  photos?: string[];
  description: string;
  progress: "pending" | "in_review" | "assigned" | "resolved" | "rejected";
  date_generated?: string;
  created_at: string;
  updated_at: string;
};

interface CitizenDashboardProps {
  userName: string;
  userData: any; // Add this prop
  onLogout: () => void;
}

export default function CitizenDashboard({
  userName,
  userData: _userData,
  onLogout,
}: CitizenDashboardProps) {
  const [active, setActive] = useState<TabKey>("dashboard");
  const [showLogout, setShowLogout] = useState(false);
  const [myReports, setMyReports] = useState<ApiReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [detailsReport, setDetailsReport] = useState<ApiReport | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const recentCards = useMemo(() => myReports.slice(0, 3), [myReports]);

  useEffect(() => {
    const load = async () => {
      setLoadingReports(true);
      setReportsError(null);
      try {
        const token = localStorage.getItem("auth_token") || "";
        const res = await fetch("http://localhost:8000/api/my-reports", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load reports");
        setMyReports(Array.isArray(data.reports) ? data.reports : []);
      } catch (e: any) {
        setReportsError(e?.message || "Failed to load reports");
      } finally {
        setLoadingReports(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (highlightId && rowRefs.current[highlightId]) {
      rowRefs.current[highlightId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      // Remove highlight after a few seconds
      const t = setTimeout(() => setHighlightId(null), 2500);
      return () => clearTimeout(t);
    }
  }, [highlightId]);

  const openDetails = async (report: ApiReport) => {
    setDetailsReport(report);
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        <aside className="w-60 shrink-0 bg-[#0038A8] text-white">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
            <div className="h-10 w-10 rounded-full bg-[#FCD116] flex items-center justify-center text-[#0038A8] font-black">
              RP
            </div>
            <div>
              <div className="text-base font-semibold leading-none">RIPARO</div>
              <div className="text-[11px] text-white/70 leading-none mt-0.5">
                Report. Process. Resolve.
              </div>
            </div>
          </div>

          <nav className="mt-2 px-2 text-sm">
            <SideLink
              label="Dashboard"
              active={active === "dashboard"}
              onClick={() => setActive("dashboard")}
            />
            <SideLink
              label="Submit Report"
              active={active === "submit"}
              onClick={() => setActive("submit")}
            />
            <SideLink
              label="Track My Report"
              active={active === "track"}
              onClick={() => setActive("track")}
            />
            <SideLink
              label="Feedback"
              active={active === "feedback"}
              onClick={() => setActive("feedback")}
            />
            <SideLink
              label="Edit Profile"
              active={active === "profile"}
              onClick={() => setActive("profile")}
            />
            <SideLink
              label="Help"
              active={active === "help"}
              onClick={() => setActive("help")}
            />
            <button
              className="mt-1 w-full text-left rounded-lg px-3 py-2 text-white/90 hover:bg-white/10"
              onClick={() => setShowLogout(true)}
            >
              Logout
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          {notice && <div className="mb-4 notice notice-success">{notice}</div>}
          {active === "dashboard" && (
            <DashboardHome
              userName={userName}
              reports={recentCards}
              onCardClick={(id) => {
                setActive("track");
                setHighlightId(id);
              }}
            />
          )}
          {active === "submit" && (
            <SubmitReport
              onNotice={(msg) => setNotice(msg)}
              onSubmitted={() => {
                // Reload reports after submission
                (async () => {
                  try {
                    const token = localStorage.getItem("auth_token") || "";
                    const res = await fetch(
                      "http://localhost:8000/api/my-reports",
                      {
                        headers: token
                          ? { Authorization: `Bearer ${token}` }
                          : {},
                      }
                    );
                    const data = await res.json();
                    if (res.ok)
                      setMyReports(
                        Array.isArray(data.reports) ? data.reports : []
                      );
                  } catch {}
                })();
                setActive("track");
              }}
            />
          )}
          {active === "track" && (
            <TrackFeedback
              loading={loadingReports}
              error={reportsError}
              reports={myReports}
              highlightId={highlightId}
              setRowRef={(id, el) => (rowRefs.current[id] = el)}
              onView={(r) => openDetails(r)}
            />
          )}
          {active === "feedback" && (
            <FeedbackForm onNotice={(msg) => setNotice(msg)} />
          )}
          {active === "profile" && <EditProfile />}
          {active === "help" && <HelpContent />}
        </main>
      </div>

      {showLogout && (
        <Modal
          title="Confirm logout"
          onClose={() => setShowLogout(false)}
          actions={
            <div className="flex gap-2">
              <button
                className="rounded-md px-3 py-2 bg-slate-200 text-slate-800"
                onClick={() => setShowLogout(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md px-3 py-2 bg-[#0038A8] text-white"
                onClick={() => {
                  setShowLogout(false);
                  onLogout();
                }}
              >
                Yes, log out
              </button>
            </div>
          }
        >
          Are you sure you want to log out?
        </Modal>
      )}

      {detailsReport && (
        <Modal
          title={`Report ${detailsReport.report_id}`}
          onClose={() => setDetailsReport(null)}
          actions={
            <button
              className="rounded-md bg-slate-200 px-3 py-2 text-slate-800"
              onClick={() => setDetailsReport(null)}
            >
              Close
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-600">Submitted by</div>
              <div className="font-semibold">
                {detailsReport.submitter_name}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-600">Type</div>
                <div className="font-medium capitalize">
                  {detailsReport.type.replaceAll("_", " ")}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Status</div>
                <div className="font-medium capitalize">
                  {detailsReport.progress === "in_review"
                    ? "In review"
                    : detailsReport.progress}
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Description</div>
              <div className="text-slate-800 whitespace-pre-wrap">
                {detailsReport.description}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-2">Progress</div>
              <ReportTimeline
                status={detailsReport.progress}
                dates={
                  {
                    submitted:
                      detailsReport.date_generated || detailsReport.created_at,
                    pending:
                      detailsReport.date_generated || detailsReport.created_at,
                    [detailsReport.progress]: detailsReport.updated_at,
                  } as any
                }
              />
            </div>
            {(Array.isArray(detailsReport.photos) &&
              detailsReport.photos.length > 0) ||
            (Array.isArray((detailsReport as any).resolution_photos) &&
              (detailsReport as any).resolution_photos.length > 0) ? (
              <div>
                <div className="text-sm text-slate-600 mb-2">
                  Before & After
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.isArray(detailsReport.photos) &&
                    detailsReport.photos.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          Before
                        </div>
                        <div className="h-36 rounded-md overflow-hidden border border-slate-200">
                          <img
                            src={detailsReport.photos[0]}
                            alt="before"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  {Array.isArray((detailsReport as any).resolution_photos) &&
                    (detailsReport as any).resolution_photos.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">After</div>
                        <div className="h-36 rounded-md overflow-hidden border border-slate-200">
                          <img
                            src={(detailsReport as any).resolution_photos[0]}
                            alt="after"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
}

function SideLink({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`mt-1 w-[15rem] text-left rounded-lg px-3 py-2 ${
        active
          ? "bg-slate-50 text-[#1e3a8a] font-semibold"
          : "text-white/90 hover:bg-white/10"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function DashboardHome({
  userName,
  reports,
  onCardClick,
}: {
  userName: string;
  reports: ApiReport[];
  onCardClick: (reportId: string) => void;
}) {
  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-4">
          <h1 className="text-xl font-bold tracking-tight">
            Welcome, {userName}!
          </h1>
          <p className="text-sm text-slate-600">
            Barangay Kinalansan, Zone 4 • Verified
          </p>
        </div>
      </div>

      <h2 className="mt-6 mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wide">
        Your recent reports
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reports.map((r) => (
          <ReportCard
            key={r.report_id}
            reportId={r.report_id}
            title={r.submitter_name}
            status={r.progress}
            thumbUrl={r.photos?.[0]}
            afterUrl={(r as any).resolution_photos?.[0]}
            createdAt={r.created_at}
            meta={`${r.type.replaceAll("_", " ")} • ${r.address}`}
            onClick={() => onCardClick(r.report_id)}
          />
        ))}
      </div>
    </div>
  );
}

function SubmitReport({
  onSubmitted,
  onNotice,
}: {
  onSubmitted: () => void;
  onNotice: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    submitter_name: "",
    age: "",
    gender: "",
    address: "",
    type: "",
    description: "",
  });
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [touchedMissing, setTouchedMissing] = useState<Record<string, boolean>>(
    {}
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setPhotos(files);
    // Generate previews
    if (files) {
      const urls = Array.from(files).map((f) => URL.createObjectURL(f));
      setPhotoPreviews(urls);
    } else {
      setPhotoPreviews([]);
    }
  };

  const removePhotoAt = (index: number) => {
    if (!photos) return;
    const filesArray = Array.from(photos);
    filesArray.splice(index, 1);
    const dt = new DataTransfer();
    filesArray.forEach((f) => dt.items.add(f));
    const newFileList = dt.files;
    setPhotos(newFileList);
    const newPreviews = [...photoPreviews];
    const [removed] = newPreviews.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed);
    setPhotoPreviews(newPreviews);
  };

  const doSubmit = async () => {
    const required: Array<keyof typeof form> = [
      "submitter_name",
      "age",
      "gender",
      "address",
      "type",
      "description",
    ];
    const missing = required.filter((k) => String(form[k]).trim() === "");
    if (missing.length) {
      const flags: Record<string, boolean> = {};
      missing.forEach((k) => (flags[k] = true));
      setTouchedMissing(flags);
      setError("Please complete the required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("submitter_name", form.submitter_name);
      fd.append("age", String(form.age));
      fd.append("gender", form.gender);
      fd.append("address", form.address);
      fd.append("type", form.type);
      fd.append("description", form.description);
      if (photos && photos.length) {
        for (let i = 0; i < photos.length; i++) {
          fd.append("photos[]", photos[i]);
        }
      }

      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch("http://localhost:8000/api/reports", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Submission failed");
      }

      const msg = `✅ Report submitted. Reference: ${
        data.report?.report_id || ""
      }`;
      setSuccess(msg);
      onNotice(msg);
      setForm({
        submitter_name: "",
        age: "",
        gender: "",
        address: "",
        type: "",
        description: "",
      });
      setPhotos(null);
      photoPreviews.forEach((u) => URL.revokeObjectURL(u));
      setPhotoPreviews([]);
      onSubmitted();
    } catch (err: any) {
      setError(err?.message || "Submission failed");
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Submit Report</h1>

      {success && (
        <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label
          className={`block ${touchedMissing.submitter_name ? "shake" : ""}`}
        >
          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
            Name of person submitting
          </span>
          <input
            name="submitter_name"
            value={form.submitter_name}
            onChange={handleChange}
            className={`w-full rounded-lg border ${
              touchedMissing.submitter_name
                ? "border-red-400"
                : "border-slate-300"
            } bg-white px-3 py-2 text-slate-800 outline-none ring-0 focus:border-slate-400`}
          />
        </label>

        <label className={`block ${touchedMissing.age ? "shake" : ""}`}>
          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
            Age
          </span>
          <input
            name="age"
            type="number"
            value={form.age}
            onChange={handleChange}
            className={`w-full rounded-lg border ${
              touchedMissing.age ? "border-red-400" : "border-slate-300"
            } bg-white px-3 py-2 text-slate-800 outline-none ring-0 focus:border-slate-400`}
          />
        </label>

        <label className={`block ${touchedMissing.gender ? "shake" : ""}`}>
          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
            Gender
          </span>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className={`w-full rounded-lg border ${
              touchedMissing.gender ? "border-red-400" : "border-slate-300"
            } bg-white px-3 py-2 text-slate-800 outline-none ring-0 focus:border-slate-400`}
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </label>

        <label
          className={`block md:col-span-2 ${
            touchedMissing.address ? "shake" : ""
          }`}
        >
          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
            Address
          </span>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            className={`w-full rounded-lg border ${
              touchedMissing.address ? "border-red-400" : "border-slate-300"
            } bg-white px-3 py-2 text-slate-800 outline-none ring-0 focus:border-slate-400`}
          />
        </label>

        <label
          className={`block md:col-span-2 ${
            touchedMissing.type ? "shake" : ""
          }`}
        >
          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
            Type of Report
          </span>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className={`w-full rounded-lg border ${
              touchedMissing.type ? "border-red-400" : "border-slate-300"
            } bg-white px-3 py-2 text-slate-800 outline-none ring-0 focus:border-slate-400`}
          >
            <option value="">Select...</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="sanitation">Sanitation</option>
            <option value="community_welfare">Community welfare</option>
            <option value="behavoural_concerns">Behavoural concerns</option>
          </select>
        </label>

        <label
          className={`block md:col-span-2 ${
            touchedMissing.description ? "shake" : ""
          }`}
        >
          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
            Description
          </span>
          <textarea
            name="description"
            rows={5}
            value={form.description}
            onChange={handleChange}
            className={`w-full rounded-lg border ${
              touchedMissing.description ? "border-red-400" : "border-slate-300"
            } bg-white px-3 py-2 text-slate-800 outline-none ring-0 focus:border-slate-400`}
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm text-slate-700">
            Upload photos (optional)
          </span>
          <input
            type="file"
            multiple
            onChange={handleFiles}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-slate-800"
          />
          {photoPreviews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {photoPreviews.map((src, idx) => (
                <div
                  key={idx}
                  className="relative h-20 w-28 overflow-hidden rounded-md border border-slate-200"
                >
                  <img
                    src={src}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhotoAt(idx)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </label>

        <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
          <button
            type="reset"
            onClick={() => {
              setForm({
                submitter_name: "",
                age: "",
                gender: "",
                address: "",
                type: "",
                description: "",
              });
              setPhotos(null);
              photoPreviews.forEach((u) => URL.revokeObjectURL(u));
              setPhotoPreviews([]);
              setError(null);
              setSuccess(null);
            }}
            className="rounded-md btn-soft px-4 py-2"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setConfirm(true)}
            className="rounded-md btn-primary px-4 py-2 disabled:opacity-50 btn"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>

      {confirm && (
        <Modal
          title="Submit report?"
          onClose={() => setConfirm(false)}
          actions={
            <div className="flex gap-2">
              <button
                className="rounded-md px-3 py-2 btn-soft"
                onClick={() => setConfirm(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="rounded-md px-3 py-2 btn-primary btn"
                onClick={doSubmit}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Confirm"}
              </button>
            </div>
          }
        >
          Your report will be submitted to the LGU.
        </Modal>
      )}
    </div>
  );
}

function TrackFeedback({
  loading,
  error,
  reports,
  highlightId,
  setRowRef,
  onView,
}: {
  loading: boolean;
  error: string | null;
  reports: ApiReport[];
  highlightId: string | null;
  setRowRef: (id: string, el: HTMLTableRowElement | null) => void;
  onView: (r: ApiReport) => void;
}) {
  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Track My Feedback</h1>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading && <div className="text-sm text-slate-600">Loading...</div>}
        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="py-2">Submission ID</th>
                <th className="py-2">Date Submitted</th>
                <th className="py-2">Category</th>
                <th className="py-2">Address</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const isHighlight = highlightId === r.report_id;
                return (
                  <tr
                    key={r.report_id}
                    ref={(el) => setRowRef(r.report_id, el)}
                    className={`border-t border-slate-100 ${
                      isHighlight ? "animate-pulse bg-amber-50" : ""
                    }`}
                  >
                    <td className="py-2 font-mono text-[12px]">
                      {r.report_id}
                    </td>
                    <td className="py-2">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 capitalize">
                      {r.type.replaceAll("_", " ")}
                    </td>
                    <td className="py-2">{r.address}</td>
                    <td className="py-2">
                      <StatusPill status={r.progress as any} />
                    </td>
                    <td className="py-2">
                      <button
                        className="text-[#0038A8] underline underline-offset-4"
                        onClick={() => onView(r)}
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <Legend color="bg-orange-500" label="Pending / In review" />
          <Legend color="bg-blue-600" label="Assigned" />
          <Legend color="bg-emerald-600" label="Resolved" />
          <Legend color="bg-red-600" label="Rejected" />
        </div>
      </div>
    </div>
  );
}

function FeedbackForm({ onNotice }: { onNotice: (msg: string) => void }) {
  const [form, setForm] = useState({
    subject: "",
    anonymous: false,
    contact_email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [touchedMissing, setTouchedMissing] = useState<Record<string, boolean>>(
    {}
  );

  const subjectMax = 150; // must match DB

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as any;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const reset = () => {
    setForm({ subject: "", anonymous: false, contact_email: "", message: "" });
    setError(null);
    setSuccess(null);
    setTouchedMissing({});
  };

  const submit = async () => {
    // simple client validation
    if (!form.message.trim()) {
      setError("Please complete the required fields.");
      setTouchedMissing((t) => ({ ...t, message: true }));
      setConfirm(false);
      return;
    }
    if (!form.anonymous && !form.contact_email.trim()) {
      setError("Please complete the required fields.");
      setTouchedMissing((t) => ({ ...t, contact_email: true }));
      setConfirm(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {
        subject: form.subject || undefined,
        anonymous: form.anonymous,
        contact_email: form.anonymous ? undefined : form.contact_email,
        message: form.message,
      };
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch("http://localhost:8000/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Submission failed");
      const msg = "✅ Feedback sent. Thank you!";
      setSuccess(msg);
      onNotice(msg);
      reset();
    } catch (e: any) {
      setError(e?.message || "Submission failed");
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Submit Feedback</h1>

      {success && <div className="mt-3 notice notice-success">{success}</div>}
      {error && <div className="mt-3 notice notice-error">{error}</div>}

      <form className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-700">Title</span>
          <input
            name="subject"
            value={form.subject}
            onChange={onChange}
            maxLength={subjectMax}
            placeholder="Optional"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none ring-0 focus:border-slate-400"
          />
          <div className="mt-1 text-xs text-slate-500">
            {form.subject.length}/{subjectMax}
          </div>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="anonymous"
            checked={form.anonymous}
            onChange={onChange}
          />
          <span className="text-sm text-slate-700">Send anonymously</span>
        </label>

        {!form.anonymous && (
          <label
            className={`block ${touchedMissing.contact_email ? "shake" : ""}`}
          >
            <span className="mb-1 block text-sm text-slate-700 required-asterisk">
              Contact email
            </span>
            <input
              type="email"
              name="contact_email"
              value={form.contact_email}
              onChange={onChange}
              placeholder="your@email.com"
              className={`w-full rounded-lg border ${
                touchedMissing.contact_email
                  ? "border-red-400"
                  : "border-slate-300"
              } bg-white px-3 py-2 text-slate-800 outline-none ring-0 focus:border-slate-400`}
            />
          </label>
        )}

        <label className={`block ${touchedMissing.message ? "shake" : ""}`}>
          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
            Message
          </span>
          <textarea
            name="message"
            rows={6}
            value={form.message}
            onChange={onChange}
            className={`w-full rounded-lg border ${
              touchedMissing.message ? "border-red-400" : "border-slate-300"
            } bg-white px-3 py-2 text-slate-800 outline-none ring-0 focus:border-slate-400`}
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md btn-soft px-4 py-2"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setConfirm(true)}
            className="rounded-md btn-primary px-4 py-2 disabled:opacity-50 btn"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>

      {confirm && (
        <Modal
          title="Send feedback?"
          onClose={() => setConfirm(false)}
          actions={
            <div className="flex gap-2">
              <button
                className="rounded-md px-3 py-2 btn-soft"
                onClick={() => setConfirm(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="rounded-md px-3 py-2 btn-primary btn"
                onClick={submit}
                disabled={loading}
              >
                {loading ? "Sending..." : "Confirm"}
              </button>
            </div>
          }
        >
          Your feedback will be sent to the LGU.
        </Modal>
      )}
    </div>
  );
}

function EditProfile() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    mobile_number: "",
    barangay: "",
    zone: "",
    password: "",
  });
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [touchedMissing, setTouchedMissing] = useState<Record<string, boolean>>(
    {}
  );

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setIdDoc(file);
  };
  const reset = () => {
    setForm({
      first_name: "",
      middle_name: "",
      last_name: "",
      email: "",
      mobile_number: "",
      barangay: "",
      zone: "",
      password: "",
    });
    setIdDoc(null);
    setTouchedMissing({});
    setError(null);
    setSuccess(null);
  };

  const validate = (): boolean => {
    const missing: Record<string, boolean> = {};
    // At least one field must be provided (non-empty)
    const keys = [
      "first_name",
      "middle_name",
      "last_name",
      "email",
      "mobile_number",
      "barangay",
      "zone",
      "password",
    ] as const;
    const hasChange = keys.some(
      (k) => String((form as any)[k]).trim().length > 0
    );
    if (!hasChange) {
      setError("Please enter at least one new value to update.");
    }
    // ID is required
    if (!idDoc) missing.id_document = true;

    setTouchedMissing((t) => ({ ...t, ...missing }));
    if (!idDoc) setError((e) => e || "Valid ID is required.");
    return hasChange && !!idDoc;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      if (form.first_name) fd.append("first_name", form.first_name);
      if (form.middle_name) fd.append("middle_name", form.middle_name);
      if (form.last_name) fd.append("last_name", form.last_name);
      if (form.email) fd.append("email", form.email);
      if (form.mobile_number) fd.append("mobile_number", form.mobile_number);
      if (form.barangay) fd.append("barangay", form.barangay);
      if (form.zone) fd.append("zone", form.zone);
      if (form.password) fd.append("password", form.password);
      if (idDoc) fd.append("id_document", idDoc);

      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(
        "http://localhost:8000/api/profile/update-request",
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Submission failed");

      setSuccess("✅ Update request submitted. Please wait for verification.");
      reset();
    } catch (e: any) {
      setError(e?.message || "Submission failed");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Edit Profile</h1>

      {success && <div className="mt-3 notice notice-success">{success}</div>}
      {error && <div className="mt-3 notice notice-error">{error}</div>}

      <form
        className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          // Validate first to show missing highlights before confirm
          const ok = validate();
          if (!ok) return;
          setShowConfirm(true);
        }}
      >
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm text-slate-700">First name</span>
          <input
            name="first_name"
            value={form.first_name}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm text-slate-700">
            Middle name (optional)
          </span>
          <input
            name="middle_name"
            value={form.middle_name}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm text-slate-700">Last name</span>
          <input
            name="last_name"
            value={form.last_name}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-700">Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-700">Barangay</span>
          <input
            name="barangay"
            value={form.barangay}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-700">Zone</span>
          <input
            name="zone"
            value={form.zone}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label
          className={`block md:col-span-2 ${
            touchedMissing.id_document ? "shake" : ""
          }`}
        >
          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
            Upload valid ID (required)
          </span>
          <input
            type="file"
            onChange={onFile}
            className={`w-full rounded-lg border ${
              touchedMissing.id_document ? "border-red-400" : "border-slate-300"
            } bg-white px-3 py-2 text-slate-800 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-slate-800`}
          />
        </label>

        <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
          <button
            type="reset"
            onClick={reset}
            className="rounded-md btn-soft px-4 py-2"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md btn-primary px-4 py-2 text-white disabled:opacity-50 btn"
          >
            {loading ? "Submitting..." : "Save Changes"}
          </button>
        </div>
      </form>

      {showConfirm && (
        <Modal
          title="Submit profile update request?"
          onClose={() => setShowConfirm(false)}
          actions={
            <div className="flex gap-2">
              <button
                className="rounded-md px-3 py-2 btn-soft"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                Review again
              </button>
              <button
                className="rounded-md px-3 py-2 btn-success disabled:opacity-50 btn"
                onClick={submit}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Confirm"}
              </button>
            </div>
          }
        >
          Please confirm the updates to your profile.
        </Modal>
      )}
    </div>
  );
}

function HelpContent() {
  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Help & Support</h1>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <section>
          <h2 className="text-sm font-semibold text-slate-700">
            Frequently Asked Questions
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li>
              How do I submit a report? Go to Submit Report and fill out the
              form.
            </li>
            <li>
              How do I track my report? Visit Track My Report for real-time
              status.
            </li>
            <li>
              Who can view my reports? Only authorized LGU personnel can access
              them.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-slate-700">
            Contact your LGU
          </h2>
          <p className="text-sm text-slate-700">
            For urgent concerns, contact your barangay hotline or visit the
            municipal office.
          </p>
        </section>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded-full ${color}`} />
      <span className="text-slate-600 text-sm">{label}</span>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: "pending" | "in_review" | "assigned" | "resolved" | "rejected";
}) {
  const color =
    status === "pending" || status === "in_review"
      ? "bg-orange-500"
      : status === "assigned"
      ? "bg-blue-600"
      : status === "resolved"
      ? "bg-emerald-600"
      : "bg-red-600";
  const text =
    status === "in_review"
      ? "In review"
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-[12px] text-slate-700">{text}</span>
    </span>
  );
}

// Removed unused Input and FileInput helpers after wiring functional form
