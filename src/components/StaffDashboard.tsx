import React, { useMemo, useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend as ChartLegend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  ChartLegend
);
import Modal from "./Modal";
import { API_URL } from "../config";

type StaffTab =
  | "dashboard"
  | "reports"
  | "overview"
  | "users"
  | "feedback"
  | "updates";
type StatCard = {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
};

type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number?: string;
  barangay?: string;
  zone?: string;
  verification_status: "pending" | "verified" | "rejected";
  id_document_path?: string | null;
  created_at: string;
};

type ReportProgress =
  | "pending"
  | "in_review"
  | "assigned"
  | "resolved"
  | "rejected";

type ReportRow = {
  id: number;
  report_id: string;
  type: string;
  progress: ReportProgress;
  created_at: string;
};

type ReportDetail = ReportRow & {
  submitter_name: string;
  age: number;
  gender: string;
  address: string;
  photos?: string[] | null;
  description: string;
  date_generated?: string | null;
};

export default function StaffDashboard({
  staffName = "Name of Staff",
  municipality = "San Jose, Camarines Sur",
  onLogout,
}: {
  staffName?: string;
  municipality?: string;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<StaffTab>("dashboard");
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Dashboard stats state
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "year">(
    "day"
  );
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [totalReports, setTotalReports] = useState(0);
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [reportsPending, setReportsPending] = useState(0);
  const [reportsResolved, setReportsResolved] = useState(0);
  const [reportsRejected, setReportsRejected] = useState(0);
  const [pendingUsers, setPendingUsers] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(
    {}
  );
  const [pendingUpdateRequests, setPendingUpdateRequests] = useState(0);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "verified" | "rejected"
  >("pending");
  const [viewUser, setViewUser] = useState<UserRow | null>(null);

  // Reports state (admin view)
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportPage, setReportPage] = useState(1);
  const [reportPerPage, setReportPerPage] = useState(10);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportFilters, setReportFilters] = useState<{
    status: "" | ReportProgress;
    type:
      | ""
      | "infrastructure"
      | "sanitation"
      | "community_welfare"
      | "behavoural_concerns";
    date_from: string;
    date_to: string;
  }>({ status: "", type: "", date_from: "", date_to: "" });
  const [detailReport, setDetailReport] = useState<ReportDetail | null>(null);

  // Update requests (profile changes) state
  type UpdateRequestRow = {
    id: number;
    user_id: number;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    mobile_number?: string | null;
    barangay?: string | null;
    zone?: string | null;
    password?: string | null; // hashed at rest; do not display
    id_document_path?: string | null;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    user?: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      mobile_number?: string | null;
      barangay?: string | null;
      zone?: string | null;
      id_document_path?: string | null;
    };
  };
  const [updates, setUpdates] = useState<UpdateRequestRow[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updatesError, setUpdatesError] = useState<string | null>(null);
  const [viewUpdate, setViewUpdate] = useState<UpdateRequestRow | null>(null);
  const [updatesNotice, setUpdatesNotice] = useState<string | null>(null);

  // Feedback state
  type FeedbackRow = {
    id: number;
    subject: string | null;
    anonymous: boolean;
    contact_email: string | null;
    message: string;
    created_at: string;
  };
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackPerPage, setFeedbackPerPage] = useState(10);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackFilters, setFeedbackFilters] = useState<{
    date_from: string;
    date_to: string;
  }>({ date_from: "", date_to: "" });
  const [viewFeedback, setViewFeedback] = useState<FeedbackRow | null>(null);

  useEffect(() => {
    if (tab !== "users") return;
    const load = async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const token = localStorage.getItem("auth_token") || "";
        const qs = filter === "all" ? "" : `?status=${filter}`;
        const res = await fetch(`${API_URL}/users${qs}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load users");
        setUsers(Array.isArray(data.users) ? data.users : []);
      } catch (e: any) {
        setUsersError(e?.message || "Failed to load users");
      } finally {
        setUsersLoading(false);
      }
    };
    load();
  }, [tab, filter]);

  const stats: StatCard[] = useMemo(
    () => [
      {
        label: "Total Reports",
        value: totalReports,
        color: "bg-blue-600",
        icon: <IconInbox />,
      },
      {
        label: "In Progress",
        value: reportsPending,
        color: "bg-orange-500",
        icon: <IconSpinner />,
      },
      {
        label: "Resolved",
        value: reportsResolved,
        color: "bg-emerald-600",
        icon: <IconCheck />,
      },
      {
        label: "Rejected",
        value: reportsRejected,
        color: "bg-red-600",
        icon: <IconX />,
      },
    ],
    [totalReports, reportsPending, reportsResolved, reportsRejected]
  );

  // removed old dummy breakdown

  const overviewRows = useMemo(
    () => [
      {
        date: "Jan 21, 2025",
        category: "Infrastructure",
        status: "in progress",
      },
      { date: "Jan 20, 2025", category: "Sanitation", status: "resolved" },
      { date: "Jan 19, 2025", category: "Noise", status: "rejected" },
      { date: "Jan 18, 2025", category: "Environment", status: "in progress" },
    ],
    []
  );

  // Load reports when tab/filters/page change
  useEffect(() => {
    if (tab !== "reports") return;
    const load = async () => {
      setReportsLoading(true);
      setReportsError(null);
      try {
        const token = localStorage.getItem("auth_token") || "";
        const params = new URLSearchParams();
        params.set("page", String(reportPage));
        params.set("per_page", String(reportPerPage));
        if (reportFilters.status) params.set("status", reportFilters.status);
        if (reportFilters.type) params.set("type", reportFilters.type);
        if (reportFilters.date_from)
          params.set("date_from", reportFilters.date_from);
        if (reportFilters.date_to) params.set("date_to", reportFilters.date_to);
        const res = await fetch(`${API_URL}/reports?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load reports");
        // Laravel paginator structure
        const items: ReportRow[] = Array.isArray(data.data)
          ? data.data
          : data.reports || [];
        setReports(items);
        const total =
          typeof data.total === "number" ? data.total : items.length;
        setReportTotal(total);
      } catch (e: any) {
        setReportsError(e?.message || "Failed to load reports");
      } finally {
        setReportsLoading(false);
      }
    };
    load();
  }, [tab, reportPage, reportPerPage, reportFilters]);

  // Load update requests when tab changes
  useEffect(() => {
    if (tab !== "updates") return;
    const load = async () => {
      setUpdatesLoading(true);
      setUpdatesError(null);
      try {
        const token = localStorage.getItem("auth_token") || "";
        const res = await fetch(`${API_URL}/update-requests?status=pending`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message || "Failed to load update requests");
        const items: UpdateRequestRow[] = Array.isArray(data.requests)
          ? data.requests
          : [];
        setUpdates(items);
      } catch (e: any) {
        setUpdatesError(e?.message || "Failed to load update requests");
      } finally {
        setUpdatesLoading(false);
      }
    };
    load();
  }, [tab]);

  // Helpers for dashboard timeframe
  function getDateFrom(range: "day" | "week" | "month" | "year"): string {
    const d = new Date();
    if (range === "day") d.setDate(d.getDate() - 1);
    if (range === "week") d.setDate(d.getDate() - 7);
    if (range === "month") d.setMonth(d.getMonth() - 1);
    if (range === "year") d.setFullYear(d.getFullYear() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Load dashboard stats (totals + categories + pending users)
  useEffect(() => {
    if (tab !== "dashboard") return;
    const load = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const token = localStorage.getItem("auth_token") || "";
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const date_from = getDateFrom(timeRange);

        // Fetch reports across pages and aggregate
        let page = 1;
        const perPage = 100;
        let total = 0;
        let pending = 0;
        let resolved = 0;
        let rejected = 0;
        const categories: Record<string, number> = {};
        // Loop pages until less than perPage returned
        // Guards in case of large datasets
        for (let i = 0; i < 50; i++) {
          const params = new URLSearchParams();
          params.set("per_page", String(perPage));
          params.set("page", String(page));
          params.set("date_from", date_from);
          const res = await fetch(`${API_URL}/reports?${params.toString()}`, {
            headers,
          });
          const data = await res.json();
          const items: ReportRow[] = Array.isArray(data.data)
            ? data.data
            : data.reports || [];
          items.forEach((r) => {
            total += 1;
            if (r.progress === "pending" || r.progress === "in_review")
              pending += 1;
            else if (r.progress === "resolved") resolved += 1;
            else if (r.progress === "rejected") rejected += 1;
            const key = r.type;
            categories[key] = (categories[key] || 0) + 1;
          });
          if (items.length < perPage) break;
          page += 1;
        }
        setTotalReports(total);
        setReportsPending(pending);
        setReportsResolved(resolved);
        setReportsRejected(rejected);
        setCategoryCounts(categories);

        // Fetch feedback totals with date filter
        let fbTotal = 0;
        {
          let page = 1;
          for (let i = 0; i < 50; i++) {
            const params = new URLSearchParams();
            params.set("per_page", String(perPage));
            params.set("page", String(page));
            params.set("date_from", date_from);
            const res = await fetch(
              `${API_URL}/feedback?${params.toString()}`,
              {
                headers,
              }
            );
            const data = await res.json();
            const items: any[] = Array.isArray(data.data)
              ? data.data
              : data.feedback || [];
            fbTotal += items.length;
            if (items.length < perPage) break;
            page += 1;
          }
        }
        setTotalFeedback(fbTotal);

        // Pending users (unverified)
        {
          const res = await fetch(`${API_URL}/users?status=pending`, {
            headers,
          });
          const data = await res.json();
          const items: any[] = Array.isArray(data.users) ? data.users : [];
          setPendingUsers(items.length);
        }

        // Pending profile update requests
        {
          const res = await fetch(`${API_URL}/update-requests?status=pending`, {
            headers,
          });
          const data = await res.json();
          const items: any[] = Array.isArray(data.requests)
            ? data.requests
            : [];
          setPendingUpdateRequests(items.length);
        }
      } catch (e: any) {
        setStatsError(e?.message || "Failed to load dashboard stats");
      } finally {
        setStatsLoading(false);
      }
    };
    load();
  }, [tab, timeRange]);

  // Load feedback when tab/filters/page change
  useEffect(() => {
    if (tab !== "feedback") return;
    const load = async () => {
      setFeedbackLoading(true);
      setFeedbackError(null);
      try {
        const token = localStorage.getItem("auth_token") || "";
        const params = new URLSearchParams();
        params.set("page", String(feedbackPage));
        params.set("per_page", String(feedbackPerPage));
        if (feedbackFilters.date_from)
          params.set("date_from", feedbackFilters.date_from);
        if (feedbackFilters.date_to)
          params.set("date_to", feedbackFilters.date_to);
        const res = await fetch(`${API_URL}/feedback?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message || "Failed to load feedback");
        const items: FeedbackRow[] = Array.isArray(data.data)
          ? data.data
          : data.feedback || [];
        setFeedback(items);
        const total =
          typeof data.total === "number" ? data.total : items.length;
        setFeedbackTotal(total);
      } catch (e: any) {
        setFeedbackError(e?.message || "Failed to load feedback");
      } finally {
        setFeedbackLoading(false);
      }
    };
    load();
  }, [tab, feedbackPage, feedbackPerPage, feedbackFilters]);

  const openReportDetail = async (id: number) => {
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`${API_URL}/reports/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load report");
      const report: ReportDetail = data.report;
      setDetailReport(report);
    } catch (e) {
      setReportsError((e as any)?.message || "Failed to load report");
    }
  };

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
              active={tab === "dashboard"}
              onClick={() => setTab("dashboard")}
            />
            <SideLink
              label="Reports"
              active={tab === "reports"}
              onClick={() => setTab("reports")}
            />
            <SideLink
              label="Feedback"
              active={tab === "feedback"}
              onClick={() => setTab("feedback")}
            />
            <SideLink
              label="Users"
              active={tab === "users"}
              onClick={() => setTab("users")}
            />
            <SideLink
              label="Update Requests"
              active={tab === "updates"}
              onClick={() => setTab("updates")}
            />
            <button
              className="mt-1 w-full text-left rounded-lg px-3 py-2 text-white/90 hover:bg-white/10"
              onClick={() => setConfirmLogout(true)}
            >
              Logout
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          {tab === "dashboard" && (
            <section>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">
                      Welcome, {staffName}
                    </h1>
                    <p className="text-sm text-slate-600">{municipality}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Timeframe:</span>
                    <select
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as any)}
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>
                  </div>
                </div>
              </div>

              {statsError && (
                <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  {statsError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">
                        {s.label}
                      </div>
                      <div
                        className={`h-8 w-8 rounded-md ${s.color} text-white flex items-center justify-center`}
                      >
                        {s.icon}
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-extrabold">
                      {statsLoading ? "…" : s.value.toLocaleString()}
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-700">
                      Total Feedback
                    </div>
                    <div className="h-8 w-8 rounded-md bg-blue-600 text-white flex items-center justify-center">
                      <IconInbox />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold">
                    {statsLoading ? "…" : totalFeedback.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-700">
                      New Users Pending
                    </div>
                    <div className="h-8 w-8 rounded-md bg-amber-500 text-white flex items-center justify-center">
                      <IconSpinner />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold">
                    {statsLoading ? "…" : pendingUsers.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-700">
                      Update Requests Pending
                    </div>
                    <div className="h-8 w-8 rounded-md bg-purple-600 text-white flex items-center justify-center">
                      <IconInbox />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold">
                    {statsLoading
                      ? "…"
                      : pendingUpdateRequests.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Category chart */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">
                  Reports by category ({timeRange})
                </h2>
                <ChartBar dataMap={categoryCounts} loading={statsLoading} />
              </div>
            </section>
          )}

          {tab === "reports" && (
            <section className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Citizen Feedback
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full md:w-auto">
                    <select
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                      value={reportFilters.status}
                      onChange={(e) => {
                        setReportPage(1);
                        setReportFilters((f) => ({
                          ...f,
                          status: e.target.value as any,
                        }));
                      }}
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="in_review">In review</option>
                      <option value="assigned">Assigned</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <select
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                      value={reportFilters.type}
                      onChange={(e) => {
                        setReportPage(1);
                        setReportFilters((f) => ({
                          ...f,
                          type: e.target.value as any,
                        }));
                      }}
                    >
                      <option value="">All Categories</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="sanitation">Sanitation</option>
                      <option value="community_welfare">
                        Community welfare
                      </option>
                      <option value="behavoural_concerns">
                        Behavoural concerns
                      </option>
                    </select>
                    <input
                      type="date"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                      value={reportFilters.date_from}
                      onChange={(e) => {
                        setReportPage(1);
                        setReportFilters((f) => ({
                          ...f,
                          date_from: e.target.value,
                        }));
                      }}
                    />
                    <input
                      type="date"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                      value={reportFilters.date_to}
                      onChange={(e) => {
                        setReportPage(1);
                        setReportFilters((f) => ({
                          ...f,
                          date_to: e.target.value,
                        }));
                      }}
                    />
                    <select
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                      value={reportPerPage}
                      onChange={(e) => {
                        setReportPage(1);
                        setReportPerPage(parseInt(e.target.value || "10", 10));
                      }}
                    >
                      <option value="10">10 / page</option>
                      <option value="20">20 / page</option>
                      <option value="50">50 / page</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="px-0 md:px-5 py-3 text-sm text-slate-600">
                    {reportsLoading
                      ? "Loading..."
                      : reportsError || `${reportTotal} total result(s)`}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-slate-600 border-b border-slate-100">
                        <tr>
                          <th className="py-2">Date Submitted</th>
                          <th className="py-2">Category</th>
                          <th className="py-2">Status</th>
                          <th className="py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-2">
                              {new Date(r.created_at).toLocaleString()}
                            </td>
                            <td className="py-2 capitalize">
                              {r.type.replaceAll("_", " ")}
                            </td>
                            <td className="py-2">
                              <StaffStatusPill status={r.progress} />
                            </td>
                            <td className="py-2">
                              <button
                                className="text-[#0038A8] underline underline-offset-4"
                                onClick={() => openReportDetail(r.id)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50 btn"
                      onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                      disabled={reportPage <= 1}
                    >
                      Prev
                    </button>
                    <Pagination
                      summaryTotal={reportTotal}
                      perPage={reportPerPage}
                      page={reportPage}
                      onPage={(p) => setReportPage(p)}
                    />
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50 btn"
                      onClick={() => setReportPage((p) => p + 1)}
                      disabled={reports.length < reportPerPage}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === "feedback" && (
            <section className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Citizen Feedback
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full md:w-auto">
                    {/* placeholders to align with Reports tab columns 1 and 2 */}
                    <div className="hidden md:block" />
                    <div className="hidden md:block" />
                    <input
                      type="date"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                      value={feedbackFilters.date_from}
                      onChange={(e) => {
                        setFeedbackPage(1);
                        setFeedbackFilters((f) => ({
                          ...f,
                          date_from: e.target.value,
                        }));
                      }}
                    />
                    <input
                      type="date"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                      value={feedbackFilters.date_to}
                      onChange={(e) => {
                        setFeedbackPage(1);
                        setFeedbackFilters((f) => ({
                          ...f,
                          date_to: e.target.value,
                        }));
                      }}
                    />
                    <select
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                      value={feedbackPerPage}
                      onChange={(e) => {
                        setFeedbackPage(1);
                        setFeedbackPerPage(
                          parseInt(e.target.value || "10", 10)
                        );
                      }}
                    >
                      <option value="10">10 / page</option>
                      <option value="20">20 / page</option>
                      <option value="50">50 / page</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="px-0 md:px-5 py-3 text-sm text-slate-600">
                    {feedbackLoading
                      ? "Loading..."
                      : feedbackError || `${feedbackTotal} total result(s)`}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {feedback.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2"
                      >
                        <div className="text-xs text-slate-500">
                          {new Date(f.created_at).toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-700">
                          {f.anonymous ? "Anonymous" : f.contact_email || "-"}
                        </div>
                        {f.subject && (
                          <div className="text-slate-800 font-semibold">
                            {f.subject}
                          </div>
                        )}
                        <div className="text-slate-700">
                          {f.message.length > 160
                            ? `${f.message.slice(0, 160)}…`
                            : f.message}
                        </div>
                        <div className="pt-1">
                          <button
                            className="text-[#0038A8] underline underline-offset-4"
                            onClick={() => setViewFeedback(f)}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50 btn"
                      onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
                      disabled={feedbackPage <= 1}
                    >
                      Prev
                    </button>
                    <Pagination
                      summaryTotal={feedbackTotal}
                      perPage={feedbackPerPage}
                      page={feedbackPage}
                      onPage={(p) => setFeedbackPage(p)}
                    />
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50 btn"
                      onClick={() => setFeedbackPage((p) => p + 1)}
                      disabled={feedback.length < feedbackPerPage}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === "overview" && (
            <section>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Feedback Overview
                  </h2>
                </div>
                <div className="px-5 pb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-600 border-b border-slate-100">
                      <tr>
                        <th className="py-2">Date Submitted</th>
                        <th className="py-2">Category</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* placeholder content */}
                      {overviewRows.map((r, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-2">{r.date}</td>
                          <td className="py-2">{r.category}</td>
                          <td className="py-2">
                            <StatusPill status={r.status as any} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {tab === "users" && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Users</h2>
                <select
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="px-5 py-3 text-sm text-slate-600 border-b border-slate-100">
                  {usersLoading
                    ? "Loading..."
                    : usersError || `${users.length} result(s)`}
                </div>
                <div className="px-5 pb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-600">
                      <tr>
                        <th className="py-2">Name</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">Barangay/Zone</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-slate-100">
                          <td className="py-2">
                            {u.first_name} {u.last_name}
                          </td>
                          <td className="py-2">{u.email}</td>
                          <td className="py-2">
                            {u.barangay || ""} {u.zone ? `• ${u.zone}` : ""}
                          </td>
                          <td className="py-2">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] ${
                                u.verification_status === "verified"
                                  ? "text-emerald-700"
                                  : u.verification_status === "rejected"
                                  ? "text-red-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {u.verification_status}
                            </span>
                          </td>
                          <td className="py-2">
                            <button
                              className="text-[#0038A8] underline underline-offset-4"
                              onClick={() => setViewUser(u)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {tab === "updates" && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">
                  Profile Update Requests
                </h2>
                <button
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                  onClick={() => {
                    // simple refresh
                    (async () => {
                      try {
                        setUpdatesLoading(true);
                        const token = localStorage.getItem("auth_token") || "";
                        const res = await fetch(
                          `${API_URL}/update-requests?status=pending`,
                          {
                            headers: token
                              ? { Authorization: `Bearer ${token}` }
                              : {},
                          }
                        );
                        const data = await res.json();
                        if (res.ok)
                          setUpdates(
                            Array.isArray(data.requests) ? data.requests : []
                          );
                      } finally {
                        setUpdatesLoading(false);
                      }
                    })();
                  }}
                >
                  Refresh
                </button>
              </div>
              {updatesNotice && (
                <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {updatesNotice}
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="px-5 py-3 text-sm text-slate-600 border-b border-slate-100">
                  {updatesLoading
                    ? "Loading..."
                    : updatesError || `${updates.length} pending request(s)`}
                </div>
                <div className="px-5 pb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-600">
                      <tr>
                        <th className="py-2">Requested At</th>
                        <th className="py-2">User</th>
                        <th className="py-2">Summary</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {updates.map((u) => {
                        const changes: string[] = [];
                        const fields: Array<keyof UpdateRequestRow> = [
                          "first_name",
                          "middle_name",
                          "last_name",
                          "email",
                          "mobile_number",
                          "barangay",
                          "zone",
                        ];
                        fields.forEach((f) => {
                          const newVal = (u as any)[f];
                          if (newVal && String(newVal).trim() !== "")
                            changes.push(String(f).replaceAll("_", " "));
                        });
                        if (u.password) changes.push("password");
                        return (
                          <tr key={u.id} className="border-t border-slate-100">
                            <td className="py-2">
                              {new Date(u.created_at).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {u.user
                                ? `${u.user.first_name} ${u.user.last_name}`
                                : `#${u.user_id}`}
                            </td>
                            <td className="py-2">
                              {changes.length ? changes.join(", ") : "-"}
                            </td>
                            <td className="py-2">
                              <button
                                className="text-[#0038A8] underline underline-offset-4"
                                onClick={() => setViewUpdate(u)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {confirmLogout && (
        <Modal
          title="Confirm logout"
          onClose={() => setConfirmLogout(false)}
          actions={
            <div className="flex gap-2">
              <button
                className="rounded-md px-3 py-2 bg-slate-200 text-slate-800"
                onClick={() => setConfirmLogout(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md px-3 py-2 bg-[#0038A8] text-white"
                onClick={() => {
                  setConfirmLogout(false);
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

      {viewUser && (
        <UserDetailsModal
          user={viewUser}
          onClose={() => setViewUser(null)}
          onUpdated={() => {
            // refresh list after status change
            setViewUser(null);
            if (tab === "users") {
              (async () => {
                try {
                  const token = localStorage.getItem("auth_token") || "";
                  const qs = filter === "all" ? "" : `?status=${filter}`;
                  const res = await fetch(`${API_URL}/users${qs}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
                  const data = await res.json();
                  if (res.ok)
                    setUsers(Array.isArray(data.users) ? data.users : []);
                } catch {}
              })();
            }
          }}
        />
      )}

      {detailReport && (
        <ReportDetailsModal
          report={detailReport}
          onClose={() => setDetailReport(null)}
          onProgressChanged={(p) => {
            setDetailReport((r) => (r ? { ...r, progress: p } : r));
            // Refresh list after progress change
            (async () => {
              try {
                const token = localStorage.getItem("auth_token") || "";
                const params = new URLSearchParams();
                params.set("page", String(reportPage));
                params.set("per_page", String(reportPerPage));
                if (reportFilters.status)
                  params.set("status", reportFilters.status);
                if (reportFilters.type) params.set("type", reportFilters.type);
                if (reportFilters.date_from)
                  params.set("date_from", reportFilters.date_from);
                if (reportFilters.date_to)
                  params.set("date_to", reportFilters.date_to);
                const res = await fetch(
                  `${API_URL}/reports?${params.toString()}`,
                  {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  }
                );
                const data = await res.json();
                if (res.ok) {
                  const items: ReportRow[] = Array.isArray(data.data)
                    ? data.data
                    : data.reports || [];
                  setReports(items);
                  setReportTotal(
                    typeof data.total === "number" ? data.total : items.length
                  );
                }
              } catch {}
            })();
          }}
        />
      )}

      {viewFeedback && (
        <Modal
          title={
            viewFeedback.subject
              ? `Feedback: ${viewFeedback.subject}`
              : "Feedback"
          }
          onClose={() => setViewFeedback(null)}
          actions={
            <button
              className="rounded-md bg-slate-200 px-3 py-2"
              onClick={() => setViewFeedback(null)}
            >
              Close
            </button>
          }
        >
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-slate-600">Date Submitted</div>
              <div className="font-medium">
                {new Date(viewFeedback.created_at).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Contact</div>
              <div className="font-medium">
                {viewFeedback.anonymous
                  ? "Anonymous"
                  : viewFeedback.contact_email || "-"}
              </div>
            </div>
            {viewFeedback.subject && (
              <div>
                <div className="text-slate-600">Subject</div>
                <div className="font-medium">{viewFeedback.subject}</div>
              </div>
            )}
            <div>
              <div className="text-slate-600">Message</div>
              <div className="text-slate-800 whitespace-pre-wrap">
                {viewFeedback.message}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {viewUpdate && (
        <UpdateRequestModal
          request={viewUpdate}
          onClose={() => setViewUpdate(null)}
          onReviewed={(msg) => {
            setViewUpdate(null);
            setUpdatesNotice(msg);
            if (tab === "updates") {
              (async () => {
                try {
                  setUpdatesLoading(true);
                  const token = localStorage.getItem("auth_token") || "";
                  const res = await fetch(
                    `${API_URL}/update-requests?status=pending`,
                    {
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : {},
                    }
                  );
                  const data = await res.json();
                  if (res.ok)
                    setUpdates(
                      Array.isArray(data.requests) ? data.requests : []
                    );
                } finally {
                  setUpdatesLoading(false);
                }
              })();
            }
          }}
        />
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

function StatusPill({
  status,
}: {
  status: "in progress" | "rejected" | "resolved";
}) {
  const map: Record<string, string> = {
    "in progress": "bg-orange-500",
    rejected: "bg-red-600",
    resolved: "bg-emerald-600",
  };
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
      <span
        className={`h-2.5 w-2.5 rounded-full ${map[status] || "bg-slate-400"}`}
      />
      <span className="text-[12px] text-slate-700 capitalize">{status}</span>
    </span>
  );
}

function StaffStatusPill({ status }: { status: ReportProgress }) {
  const map: Record<ReportProgress, string> = {
    pending: "bg-orange-500",
    in_review: "bg-orange-500",
    assigned: "bg-blue-600",
    resolved: "bg-emerald-600",
    rejected: "bg-red-600",
  };
  const label =
    status === "in_review"
      ? "In review"
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
      <span
        className={`h-2.5 w-2.5 rounded-full ${map[status] || "bg-slate-400"}`}
      />
      <span className="text-[12px] text-slate-700">{label}</span>
    </span>
  );
}

function ChartBar({
  dataMap,
  loading,
}: {
  dataMap: Record<string, number>;
  loading: boolean;
}) {
  const labels = Object.keys(dataMap).map((k) => k.replaceAll("_", " "));
  const values = Object.values(dataMap);
  const data = {
    labels: [...labels],
    datasets: [
      {
        label: "Reports",
        data: [...values],
        backgroundColor: labels.map((_, i) => {
          const palette = [
            "#1e3a8a",
            "#2563eb",
            "#0891b2",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#a78bfa",
            "#22c55e",
            "#f97316",
            "#14b8a6",
            "#eab308",
            "#fb7185",
          ];
          return palette[i % palette.length];
        }),
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { ticks: { color: "#334155" } },
      y: { ticks: { color: "#334155" }, beginAtZero: true, precision: 0 },
    },
  };
  return (
    <div className="h-48 md:h-[32rem]">
      {loading && <div className="text-sm text-slate-600 mb-2">Loading…</div>}
      {labels.length === 0 ? (
        <div className="text-sm text-slate-500">No data</div>
      ) : (
        <Bar data={data} options={options} />
      )}
    </div>
  );
}

/* Icons via Material Icons (see index.html snippet below) */
function IconInbox() {
  return (
    <span className="material-icons-outlined text-white text-[18px] leading-none">
      inbox
    </span>
  );
}
function IconSpinner() {
  return (
    <span className="material-icons-outlined text-white text-[18px] leading-none">
      autorenew
    </span>
  );
}
function IconCheck() {
  return (
    <span className="material-icons-outlined text-white text-[18px] leading-none">
      check_circle
    </span>
  );
}
function IconX() {
  return (
    <span className="material-icons-outlined text-white text-[18px] leading-none">
      cancel
    </span>
  );
}

// MiniBar removed (unused)

function UserDetailsModal({
  user,
  onClose,
  onUpdated,
}: {
  user: UserRow;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const act = async (action: "verify" | "reject" | "pending") => {
    try {
      setSaving(true);
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`${API_URL}/users/${user.id}/verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed");
      onUpdated();
    } catch (e) {
      // simple swallow
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`User: ${user.first_name} ${user.last_name}`}
      onClose={onClose}
      actions={
        <div className="flex gap-2">
          <button
            className="rounded-md bg-slate-200 px-3 py-2"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
          <button
            className="rounded-md bg-amber-500 px-3 py-2 text-white"
            onClick={() => act("pending")}
            disabled={saving}
          >
            Set Pending
          </button>
          <button
            className="rounded-md bg-red-600 px-3 py-2 text-white"
            onClick={() => act("reject")}
            disabled={saving}
          >
            Reject
          </button>
          <button
            className="rounded-md bg-emerald-600 px-3 py-2 text-white"
            onClick={() => act("verify")}
            disabled={saving}
          >
            Verify
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-slate-600">Email</div>
            <div className="font-medium">{user.email}</div>
          </div>
          <div>
            <div className="text-slate-600">Mobile</div>
            <div className="font-medium">{user.mobile_number || "-"}</div>
          </div>
          <div>
            <div className="text-slate-600">Barangay / Zone</div>
            <div className="font-medium">
              {user.barangay || ""} {user.zone ? `• ${user.zone}` : ""}
            </div>
          </div>
          <div>
            <div className="text-slate-600">Registered</div>
            <div className="font-medium">
              {new Date(user.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        <div>
          <div className="text-slate-600 mb-1">ID Document</div>
          {user.id_document_path ? (
            <img
              src={user.id_document_path}
              alt="ID"
              className="h-40 rounded-md border border-slate-200 object-cover"
            />
          ) : (
            <div className="text-slate-500">No ID uploaded</div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ReportDetailsModal({
  report,
  onClose,
  onProgressChanged,
}: {
  report: ReportDetail;
  onClose: () => void;
  onProgressChanged: (p: ReportProgress) => void;
}) {
  const [progress, setProgress] = useState<ReportProgress>(report.progress);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resFiles, setResFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localReport, setLocalReport] = useState(report);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`${API_URL}/reports/${report.id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ progress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update");
      onProgressChanged(progress);
    } catch (e: any) {
      setError(e?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const uploadResolution = async (markResolved: boolean) => {
    if (!resFiles || resFiles.length === 0) return;
    try {
      setUploading(true);
      setError(null);
      const fd = new FormData();
      Array.from(resFiles).forEach((f) => fd.append("photos[]", f));
      if (markResolved) fd.append("mark_resolved", "1");
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(
        `${API_URL}/reports/${report.id}/resolution-photos`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");
      const updated = data.report as ReportDetail & {
        resolution_photos?: string[];
      };
      setLocalReport((r) => ({ ...r, ...updated } as any));
      if (updated.progress === "resolved") onProgressChanged("resolved");
      setResFiles(null);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title={`Report ${report.report_id}`}
      onClose={onClose}
      actions={
        <div className="flex gap-2">
          <button
            className="rounded-md px-3 py-2 bg-slate-200 text-slate-800"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
          <button
            className="rounded-md px-3 py-2 bg-[#1e3a8a] text-white disabled:opacity-50"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-slate-600">Submitted by</div>
            <div className="font-medium">{localReport.submitter_name}</div>
          </div>
          <div>
            <div className="text-slate-600">Date Submitted</div>
            <div className="font-medium">
              {new Date(localReport.created_at).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-slate-600">Category</div>
            <div className="font-medium capitalize">
              {localReport.type.replaceAll("_", " ")}
            </div>
          </div>
          <div>
            <div className="text-slate-600">Status</div>
            <div className="font-medium">
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                value={progress}
                onChange={(e) => setProgress(e.target.value as ReportProgress)}
              >
                <option value="pending">Pending</option>
                <option value="in_review">In review</option>
                <option value="assigned">Assigned</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-slate-600">Address</div>
            <div className="font-medium">{localReport.address}</div>
          </div>
          <div>
            <div className="text-slate-600">Gender / Age</div>
            <div className="font-medium">
              {localReport.gender} • {localReport.age}
            </div>
          </div>
        </div>
        <div>
          <div className="text-slate-600">Description</div>
          <div className="text-slate-800 whitespace-pre-wrap">
            {localReport.description}
          </div>
        </div>
        {Array.isArray(localReport.photos) && localReport.photos.length > 0 && (
          <div>
            <div className="text-slate-600 mb-2">Photos</div>
            <div className="flex flex-wrap gap-3">
              {localReport.photos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="attachment"
                  className="h-24 w-36 rounded-md object-cover border border-slate-200"
                />
              ))}
            </div>
          </div>
        )}

        {/* Resolution Evidence */}
        <div>
          <div className="text-slate-600 mb-2">Resolution Evidence (After)</div>
          {Array.isArray((localReport as any).resolution_photos) &&
          (localReport as any).resolution_photos.length > 0 ? (
            <div className="flex flex-wrap gap-3 mb-3">
              {(localReport as any).resolution_photos.map(
                (src: string, i: number) => (
                  <img
                    key={i}
                    src={src}
                    alt="after"
                    className="h-24 w-36 rounded-md object-cover border border-slate-200"
                  />
                )
              )}
            </div>
          ) : (
            <div className="text-slate-500 mb-2">No after images yet.</div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="file"
              multiple
              onChange={(e) => setResFiles(e.target.files)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
            />
            <button
              className="rounded-md bg-emerald-600 px-3 py-2 text-white disabled:opacity-50"
              disabled={uploading || !resFiles || resFiles.length === 0}
              onClick={() => uploadResolution(true)}
            >
              {uploading ? "Uploading..." : "Upload & Mark Resolved"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function UpdateRequestModal({
  request,
  onClose,
  onReviewed,
}: {
  request: any;
  onClose: () => void;
  onReviewed: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(
        `${API_URL}/update-requests/${request.id}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ action: "approve" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to approve");
      onReviewed("✅ Request approved and applied.");
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(
        `${API_URL}/update-requests/${request.id}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ action: "reject" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to reject");
      onReviewed("✅ Request rejected.");
    } catch (e: any) {
      setError(e?.message || "Failed to reject");
    } finally {
      setSaving(false);
    }
  };

  const diffRows: Array<{ label: string; oldVal: any; newVal: any }> = [];
  const map: Array<{ key: string; label: string }> = [
    { key: "first_name", label: "First name" },
    { key: "middle_name", label: "Middle name" },
    { key: "last_name", label: "Last name" },
    { key: "email", label: "Email" },
    { key: "mobile_number", label: "Mobile" },
    { key: "barangay", label: "Barangay" },
    { key: "zone", label: "Zone" },
  ];
  map.forEach(({ key, label }) => {
    const newVal = (request as any)[key];
    if (newVal !== null && newVal !== undefined && String(newVal) !== "") {
      const oldVal = request.user ? (request.user as any)[key] : undefined;
      diffRows.push({ label, oldVal, newVal });
    }
  });
  if (request.password) {
    diffRows.push({
      label: "Password",
      oldVal: "••••••••",
      newVal: "••••••••",
    });
  }

  return (
    <Modal
      title={`Update Request #${request.id}`}
      onClose={onClose}
      actions={
        <div className="flex gap-2">
          <button
            className="rounded-md bg-slate-200 px-3 py-2"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
          <button
            className="rounded-md bg-red-600 px-3 py-2 text-white disabled:opacity-50"
            onClick={reject}
            disabled={saving}
          >
            Reject
          </button>
          <button
            className="rounded-md bg-emerald-600 px-3 py-2 text-white disabled:opacity-50"
            onClick={approve}
            disabled={saving}
          >
            Approve & Apply
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-slate-600">User</div>
            <div className="font-medium">
              {request.user
                ? `${request.user.first_name} ${request.user.last_name}`
                : `#${request.user_id}`}
            </div>
          </div>
          <div>
            <div className="text-slate-600">Requested At</div>
            <div className="font-medium">
              {new Date(request.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        <div>
          <div className="text-slate-600 mb-2">Changes</div>
          {diffRows.length === 0 ? (
            <div className="text-slate-500">No field deltas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="py-2">Field</th>
                    <th className="py-2">Current</th>
                    <th className="py-2">Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {diffRows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-2">{r.label}</td>
                      <td className="py-2">{r.oldVal ?? "-"}</td>
                      <td className="py-2 font-medium">{r.newVal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <div className="text-slate-600 mb-1">New Valid ID</div>
          {request.id_document_path ? (
            <img
              src={request.id_document_path}
              alt="ID"
              className="h-40 rounded-md border border-slate-200 object-cover"
            />
          ) : (
            <div className="text-slate-500">No ID provided</div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Pagination({
  summaryTotal,
  perPage,
  page,
  onPage,
}: {
  summaryTotal: number;
  perPage: number;
  page: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(summaryTotal / perPage));
  const pages: number[] = [];
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, Math.min(start, end - windowSize + 1));
  for (let p = start; p <= end; p++) pages.push(p);
  return (
    <div className="flex items-center gap-1">
      {pages.map((p) => (
        <button
          key={p}
          className={`rounded-md px-3 py-1 text-sm border ${
            p === page
              ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
              : "bg-white text-slate-800 border-slate-300"
          }`}
          onClick={() => onPage(p)}
        >
          {p}
        </button>
      ))}
      <span className="ml-2 text-xs text-slate-500">of {totalPages}</span>
    </div>
  );
}
