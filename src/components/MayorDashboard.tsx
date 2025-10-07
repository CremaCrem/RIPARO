import React, { useMemo, useState, useEffect } from "react";
import Modal from "./Modal";
import { API_URL } from "../config";
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

type MayorTab = "dashboard" | "reports" | "feedback" | "users" | "updates";
type StatCard = {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
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

type FeedbackRow = {
  id: number;
  subject: string | null;
  anonymous: boolean;
  contact_email: string | null;
  message: string;
  created_at: string;
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

export default function MayorDashboard({
  mayorName = "Hon. Mayor",
  municipality = "San Jose, Camarines Sur",
  onLogout,
}: {
  mayorName?: string;
  municipality?: string;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<MayorTab>("dashboard");
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
  const [pendingUpdateRequests, setPendingUpdateRequests] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(
    {}
  );

  // Lists state
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
  // removed unused detailReport state

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
  // removed unused viewFeedback state

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

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
    password?: string | null;
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
  // removed unused viewUpdate state

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

  // Dashboard stats
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

        // Reports aggregate
        let page = 1;
        const perPage = 100;
        let total = 0,
          pending = 0,
          resolved = 0,
          rejected = 0;
        const categories: Record<string, number> = {};
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
            categories[r.type] = (categories[r.type] || 0) + 1;
          });
          if (items.length < perPage) break;
          page += 1;
        }
        setTotalReports(total);
        setReportsPending(pending);
        setReportsResolved(resolved);
        setReportsRejected(rejected);
        setCategoryCounts(categories);

        // Feedback total
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
              { headers }
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

        // Pending users & update requests
        {
          const res = await fetch(`${API_URL}/users?status=pending`, {
            headers,
          });
          const data = await res.json();
          setPendingUsers(Array.isArray(data.users) ? data.users.length : 0);
        }
        {
          const res = await fetch(`${API_URL}/update-requests?status=pending`, {
            headers,
          });
          const data = await res.json();
          setPendingUpdateRequests(
            Array.isArray(data.requests) ? data.requests.length : 0
          );
        }
      } catch (e: any) {
        setStatsError(e?.message || "Failed to load dashboard stats");
      } finally {
        setStatsLoading(false);
      }
    };
    load();
  }, [tab, timeRange]);

  // Reports list
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

  // Feedback list
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

  // Users list (view only)
  useEffect(() => {
    if (tab !== "users") return;
    const load = async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const token = localStorage.getItem("auth_token") || "";
        const res = await fetch(`${API_URL}/users?status=all`, {
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
  }, [tab]);

  // Update requests list (view only)
  useEffect(() => {
    if (tab !== "updates") return;
    const load = async () => {
      setUpdatesLoading(true);
      setUpdatesError(null);
      try {
        const token = localStorage.getItem("auth_token") || "";
        const res = await fetch(`${API_URL}/update-requests`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message || "Failed to load update requests");
        setUpdates(Array.isArray(data.requests) ? data.requests : []);
      } catch (e: any) {
        setUpdatesError(e?.message || "Failed to load update requests");
      } finally {
        setUpdatesLoading(false);
      }
    };
    load();
  }, [tab]);

  const statsCards: StatCard[] = stats;

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
                      Welcome, {mayorName}
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
                <div className="mt-3 notice notice-error">{statsError}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
                {statsCards.map((s) => (
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
                      onPage={(p: number) => setReportPage(p)}
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
                    <div className="col-span-2 md:col-span-3" />
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-slate-600 border-b border-slate-100">
                        <tr>
                          <th className="py-2">Date Submitted</th>
                          <th className="py-2">Contact</th>
                          <th className="py-2">Subject</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedback.map((f) => (
                          <tr
                            key={f.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-2">
                              {new Date(f.created_at).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {f.anonymous
                                ? "Anonymous"
                                : f.contact_email || "-"}
                            </td>
                            <td className="py-2">{f.subject || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                      onPage={(p: number) => setFeedbackPage(p)}
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

          {tab === "users" && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Users</h2>
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
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="px-5 py-3 text-sm text-slate-600 border-b border-slate-100">
                  {updatesLoading
                    ? "Loading..."
                    : updatesError || `${updates.length} request(s)`}
                </div>
                <div className="px-5 pb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-600">
                      <tr>
                        <th className="py-2">Requested At</th>
                        <th className="py-2">User</th>
                        <th className="py-2">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {updates.map((u) => {
                        const changes: string[] = [];
                        (
                          [
                            "first_name",
                            "middle_name",
                            "last_name",
                            "email",
                            "mobile_number",
                            "barangay",
                            "zone",
                          ] as const
                        ).forEach((f) => {
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

function Pagination({
  summaryTotal,
  perPage,
  page,
  onPage,
}: {
  summaryTotal: number;
  perPage: number;
  page: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(
    1,
    Math.ceil((summaryTotal || 0) / Math.max(1, perPage))
  );
  const currentPage = Math.min(Math.max(1, page), totalPages);

  function buildPages(): number[] {
    const pages: number[] = [];
    const maxButtons = 7;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }

  const pages = buildPages();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
        onClick={() => onPage(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
      >
        ‹
      </button>
      {pages[0] > 1 && (
        <>
          <button
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            onClick={() => onPage(1)}
          >
            1
          </button>
          {pages[0] > 2 && <span className="px-1 text-slate-500">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          className={`rounded-md px-2 py-1 text-sm border ${
            p === currentPage
              ? "border-[#0038A8] bg-[#0038A8] text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => onPage(p)}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="px-1 text-slate-500">…</span>
          )}
          <button
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            onClick={() => onPage(totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
        onClick={() => onPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
      >
        ›
      </button>
    </div>
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
  const data = {
    labels: [...labels],
    datasets: [
      {
        label: "Reports",
        data: [...values],
        backgroundColor: labels.map((_, i) => palette[i % palette.length]),
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: false } },
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

/* Icons via Material Icons */
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
