import React, { useMemo, useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import RIPARO_Logo from "../assets/RIPARO_Logo_White.png";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend as ChartLegend,
} from "chart.js";
import {
  HomeIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  InboxIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDoubleRightIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  ChartLegend
);
import Modal from "./Modal";
import { API_URL, resolveAssetUrl } from "../config";

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
  icon: React.ComponentType<{ className?: string }>;
  bgColor?: string;
  borderColor?: string;
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Animated counter hook
  const useAnimatedCounter = (target: number, duration = 1000) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      let start = 0;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }, [target, duration]);
    return count;
  };

  // Pre-calculate animated counters for all stats
  const animatedTotalReports = useAnimatedCounter(totalReports);
  const animatedPending = useAnimatedCounter(reportsPending);
  const animatedResolved = useAnimatedCounter(reportsResolved);
  const animatedRejected = useAnimatedCounter(reportsRejected);
  const animatedFeedback = useAnimatedCounter(totalFeedback);
  const animatedPendingUsers = useAnimatedCounter(pendingUsers);
  const animatedUpdateRequests = useAnimatedCounter(pendingUpdateRequests);

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
        color: "bg-gradient-to-r from-blue-500 to-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        icon: InboxIcon,
      },
      {
        label: "In Progress",
        value: reportsPending,
        color: "bg-gradient-to-r from-pink-400 to-pink-500",
        bgColor: "bg-pink-50",
        borderColor: "border-pink-200",
        icon: ClockIcon,
      },
      {
        label: "Resolved",
        value: reportsResolved,
        color: "bg-gradient-to-r from-emerald-500 to-emerald-600",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        icon: CheckCircleIcon,
      },
      {
        label: "Disapprove",
        value: reportsRejected,
        color: "bg-gradient-to-r from-red-500 to-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        icon: XCircleIcon,
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800">
      {/* Mobile Header */}
      <header className="lg:hidden bg-[#0e2a7a] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={RIPARO_Logo}
            alt="RIPARO"
            className="h-8 w-8 object-contain"
          />
          <div>
            <div className="text-sm font-semibold leading-none">RIPARO</div>
            <div className="text-[10px] text-white/70 leading-none mt-0.5">
              Report. Process. Resolve.
            </div>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle mobile menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed left-0 top-0 h-full w-64 bg-[#0e2a7a] text-white overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-6">
                <img
                  src={RIPARO_Logo}
                  alt="RIPARO"
                  className="h-10 w-10 object-contain"
                />
                <div>
                  <div className="text-base font-semibold leading-none">
                    RIPARO
                  </div>
                  <div className="text-[11px] text-white/70 leading-none mt-0.5">
                    Report. Process. Resolve.
                  </div>
                </div>
              </div>

              <nav className="space-y-2">
                <MobileSideLink
                  label="Dashboard"
                  active={tab === "dashboard"}
                  icon={<HomeIcon className="h-5 w-5" />}
                  onClick={() => {
                    setTab("dashboard");
                    setMobileMenuOpen(false);
                  }}
                />
                <MobileSideLink
                  label="Reports"
                  active={tab === "reports"}
                  icon={<DocumentTextIcon className="h-5 w-5" />}
                  onClick={() => {
                    setTab("reports");
                    setMobileMenuOpen(false);
                  }}
                />
                <MobileSideLink
                  label="Feedback"
                  active={tab === "feedback"}
                  icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
                  onClick={() => {
                    setTab("feedback");
                    setMobileMenuOpen(false);
                  }}
                />
                <MobileSideLink
                  label="Users"
                  active={tab === "users"}
                  icon={<UserGroupIcon className="h-5 w-5" />}
                  onClick={() => {
                    setTab("users");
                    setMobileMenuOpen(false);
                  }}
                />
                <MobileSideLink
                  label="Update Requests"
                  active={tab === "updates"}
                  icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                  onClick={() => {
                    setTab("updates");
                    setMobileMenuOpen(false);
                  }}
                />
                <button
                  className="w-full text-left rounded-lg px-3 py-2.5 text-white/90 transition-all duration-200 hover:bg-white/10 flex items-center gap-3 mt-4"
                  onClick={() => {
                    setConfirmLogout(true);
                    setMobileMenuOpen(false);
                  }}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        <aside
          className={`${
            collapsed ? "w-16" : "w-64"
          } hidden lg:block shrink-0 bg-[#0e2a7a] text-white relative overflow-hidden transition-all duration-300 ease-in-out`}
        >
          <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-[#2563eb] via-[#0038A8] to-[#001a57] animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-[#FCD116]/5" />

          {/* Logo Section */}
          <div className="relative px-2 py-4 border-b border-white/10">
            <div className="flex items-center">
              {collapsed ? (
                <img
                  src={RIPARO_Logo}
                  alt="RIPARO"
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <img
                    src={RIPARO_Logo}
                    alt="RIPARO"
                    className="h-10 w-10 object-contain"
                  />
                  <div>
                    <div className="text-base font-semibold leading-none tracking-wide">
                      RIPARO
                    </div>
                    <div className="text-[11px] text-white/70 leading-none mt-0.5">
                      Report. Process. Resolve.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Toggle Button - Moved to bottom of sidebar */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <button
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
              className="rounded-lg hover:bg-white/10 p-2 text-white/90 focus:outline-2 focus:outline-[#FCD116] transition-all duration-200 hover:scale-110 bg-white/5 backdrop-blur-sm"
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? (
                <ChevronDoubleRightIcon className="h-5 w-5" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <nav className="relative mt-3 px-2 pb-6 text-sm space-y-1">
            <SideLink
              label="Dashboard"
              active={tab === "dashboard"}
              icon={<HomeIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setTab("dashboard")}
            />
            <SideLink
              label="Reports"
              active={tab === "reports"}
              icon={<DocumentTextIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setTab("reports")}
            />
            <SideLink
              label="Feedback"
              active={tab === "feedback"}
              icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setTab("feedback")}
            />
            <SideLink
              label="Users"
              active={tab === "users"}
              icon={<UserGroupIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setTab("users")}
            />
            <SideLink
              label="Update Requests"
              active={tab === "updates"}
              icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setTab("updates")}
            />
            <button
              className={`mt-4 w-full ${
                collapsed ? "justify-center" : "text-left"
              } rounded-lg px-3 py-2 text-white/90 outline-offset-2 transition-all duration-200 focus:outline-2 focus:outline-white hover:bg-white hover:text-black hover:scale-105 flex items-center gap-3 group`}
              onClick={() => setConfirmLogout(true)}
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              {!collapsed && <span>Logout</span>}
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6 lg:p-8 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-[#0038A8]/5 to-[#FCD116]/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-[#FCD116]/5 to-[#0038A8]/5 rounded-full blur-3xl animate-pulse delay-1000" />

          {tab === "dashboard" && (
            <section className="animate-in fade-in duration-500 slide-in-from-bottom-4">
              <div className="relative rounded-2xl bg-white/90 backdrop-blur-lg border border-slate-200 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.2)] transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8]/5 via-transparent to-[#FCD116]/5 rounded-2xl" />
                <div className="relative px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">
                      Welcome, {staffName}! 👋
                    </h1>
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      {municipality}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Timeframe:</span>
                    <select
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
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

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mt-4">
                {stats.map((s) => {
                  // Get the corresponding animated count
                  let animatedCount;
                  switch (s.label) {
                    case "Total Reports":
                      animatedCount = animatedTotalReports;
                      break;
                    case "In Progress":
                      animatedCount = animatedPending;
                      break;
                    case "Resolved":
                      animatedCount = animatedResolved;
                      break;
                    case "Rejected":
                      animatedCount = animatedRejected;
                      break;
                    default:
                      animatedCount = s.value;
                  }

                  return (
                    <div
                      key={s.label}
                      className={`group relative rounded-xl border ${s.borderColor} ${s.bgColor} p-3 sm:p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <div className="relative flex items-center justify-between">
                        <div className="text-xs sm:text-sm font-semibold text-slate-700">
                          {s.label}
                        </div>
                        <div
                          className={`p-1.5 sm:p-2 rounded-lg ${s.color} shadow-sm`}
                        >
                          <s.icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 transition-all duration-300 group-hover:text-slate-800">
                        {statsLoading ? "…" : animatedCount.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
                <div className="group relative rounded-xl border border-cyan-200 bg-cyan-50 p-3 sm:p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="relative flex items-center justify-between">
                    <div className="text-xs sm:text-sm font-semibold text-slate-700">
                      Total Feedback
                    </div>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-sm">
                      <ChatBubbleLeftRightIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 transition-all duration-300 group-hover:text-slate-800">
                    {statsLoading ? "…" : animatedFeedback.toLocaleString()}
                  </div>
                </div>
                <div className="group relative rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="relative flex items-center justify-between">
                    <div className="text-xs sm:text-sm font-semibold text-slate-700">
                      New Users Pending
                    </div>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm">
                      <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 transition-all duration-300 group-hover:text-slate-800">
                    {statsLoading ? "…" : animatedPendingUsers.toLocaleString()}
                  </div>
                </div>
                <div className="group relative rounded-xl border border-indigo-200 bg-indigo-50 p-3 sm:p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="relative flex items-center justify-between">
                    <div className="text-xs sm:text-sm font-semibold text-slate-700">
                      Update Requests Pending
                    </div>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-sm">
                      <ClipboardDocumentListIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 transition-all duration-300 group-hover:text-slate-800">
                    {statsLoading
                      ? "…"
                      : animatedUpdateRequests.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Category chart */}
              <div className="mt-4 relative rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-4 sm:p-5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.2)] transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 rounded-2xl" />
                <div className="relative">
                  <h2 className="text-sm font-semibold text-slate-700 mb-3">
                    Reports by category ({timeRange})
                  </h2>
                  <ChartBar dataMap={categoryCounts} loading={statsLoading} />
                </div>
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
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
                      <option value="rejected">Disapprove</option>
                    </select>
                    <select
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
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
                          <th className="py-2 text-xs sm:text-sm">
                            Date Submitted
                          </th>
                          <th className="py-2 text-xs sm:text-sm">Category</th>
                          <th className="py-2 text-xs sm:text-sm">Status</th>
                          <th className="py-2 text-xs sm:text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-2 text-xs">
                              {new Date(r.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-2 capitalize text-xs">
                              {r.type.replaceAll("_", " ")}
                            </td>
                            <td className="py-2">
                              <StaffStatusPill status={r.progress} />
                            </td>
                            <td className="py-2">
                              <button
                                className="text-[#0038A8] underline underline-offset-4 hover:text-[#0038A8]/80 transition-colors duration-200 text-xs"
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50 btn hover:bg-slate-50 transition-all duration-200"
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50 btn hover:bg-slate-50 transition-all duration-200"
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                            className="text-[#0038A8] underline underline-offset-4 hover:text-[#0038A8]/80 transition-colors duration-200"
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50 btn hover:bg-slate-50 transition-all duration-200"
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
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50 btn hover:bg-slate-50 transition-all duration-200"
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
                        <th className="py-2 text-xs sm:text-sm">Name</th>
                        <th className="py-2 text-xs sm:text-sm hidden sm:table-cell">
                          Email
                        </th>
                        <th className="py-2 text-xs sm:text-sm hidden md:table-cell">
                          Barangay/Zone
                        </th>
                        <th className="py-2 text-xs sm:text-sm">Status</th>
                        <th className="py-2 text-xs sm:text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-slate-100">
                          <td className="py-2 text-xs">
                            <div className="font-medium">
                              {u.first_name} {u.last_name}
                            </div>
                            <div className="text-slate-500 sm:hidden">
                              {u.email}
                            </div>
                          </td>
                          <td className="py-2 hidden sm:table-cell text-xs">
                            {u.email}
                          </td>
                          <td className="py-2 hidden md:table-cell text-xs">
                            {u.barangay || ""} {u.zone ? `• ${u.zone}` : ""}
                          </td>
                          <td className="py-2">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 sm:px-3 py-1 text-[10px] sm:text-[12px] ${
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
                              className="text-[#0038A8] underline underline-offset-4 hover:text-[#0038A8]/80 transition-colors duration-200 text-xs"
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
                        <th className="py-2 text-xs sm:text-sm">
                          Requested At
                        </th>
                        <th className="py-2 text-xs sm:text-sm">User</th>
                        <th className="py-2 text-xs sm:text-sm hidden md:table-cell">
                          Summary
                        </th>
                        <th className="py-2 text-xs sm:text-sm">Actions</th>
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
                            <td className="py-2 text-xs">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-2 text-xs">
                              <div className="font-medium">
                                {u.user
                                  ? `${u.user.first_name} ${u.user.last_name}`
                                  : `#${u.user_id}`}
                              </div>
                              {changes.length > 0 && (
                                <div className="text-slate-500 md:hidden text-[10px]">
                                  {changes.slice(0, 2).join(", ")}
                                  {changes.length > 2 &&
                                    ` +${changes.length - 2}`}
                                </div>
                              )}
                            </td>
                            <td className="py-2 hidden md:table-cell text-xs">
                              {changes.length ? changes.join(", ") : "-"}
                            </td>
                            <td className="py-2">
                              <button
                                className="text-[#0038A8] underline underline-offset-4 hover:text-[#0038A8]/80 transition-colors duration-200 text-xs"
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
  icon,
  collapsed,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  collapsed?: boolean;
}) {
  return (
    <div className="relative group">
      <button
        className={`w-full ${
          collapsed ? "justify-center" : "text-left"
        } rounded-lg px-3 py-2.5 transition-all duration-200 outline-offset-2 focus:outline-2 focus:outline-white ${
          active
            ? "bg-white text-black font-semibold ring-1 ring-white shadow-lg transform scale-105"
            : "text-white/90 hover:bg-white hover:text-black hover:scale-105 hover:shadow-md"
        } flex items-center gap-3 relative overflow-hidden`}
        onClick={onClick}
      >
        <div className="relative z-10 flex items-center gap-3">
          {icon}
          {!collapsed && (
            <span className="transition-all duration-200">{label}</span>
          )}
        </div>
      </button>
      {collapsed && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {label}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full border-4 border-transparent border-r-slate-900" />
        </div>
      )}
    </div>
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
      : status === "rejected"
      ? "Disapprove"
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
    <div className="h-64 sm:h-80 md:h-96 lg:h-[28rem] xl:h-[32rem]">
      {loading && <div className="text-sm text-slate-600 mb-2">Loading…</div>}
      {labels.length === 0 ? (
        <div className="text-sm text-slate-500">No data</div>
      ) : (
        <Bar data={data} options={options} />
      )}
    </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  const [success, setSuccess] = useState<string | null>(null);
  const [resFiles, setResFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localReport, setLocalReport] = useState(report);

  // Track original state to detect changes
  const originalProgress = useRef<ReportProgress>(report.progress);

  // Track if any changes have been made
  const hasChanges = progress !== originalProgress.current;

  // Auto-hide notifications
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
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

      setSuccess("✅ Report status updated successfully!");
      setLocalReport((prev) => ({ ...prev, progress }));
      onProgressChanged(progress);
      // Reset the original progress to match the new progress
      // This will make hasChanges return false until the next change
      originalProgress.current = progress;
    } catch (e: any) {
      setError(e?.message || "Failed to update report status");
    } finally {
      setSaving(false);
    }
  };

  const uploadResolution = async (markResolved: boolean) => {
    if (!resFiles || resFiles.length === 0) return;
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      const fd = new FormData();
      Array.from(resFiles).forEach((f) => fd.append("photos[]", f));
      if (markResolved) {
        fd.append("mark_resolved", "1");
        setProgress("resolved"); // Update local state immediately
      }
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

      if (markResolved) {
        setSuccess(
          "✅ Resolution photos uploaded and report marked as resolved!"
        );
        onProgressChanged("resolved");
      } else {
        setSuccess("✅ Resolution photos uploaded successfully!");
      }
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
      size="4xl"
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
            disabled={saving || !hasChanges}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      }
    >
      {/* Success Notification */}
      {success && (
        <div className="mb-4 relative rounded-xl border border-emerald-300 bg-emerald-50/90 backdrop-blur-md px-4 py-3 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent rounded-xl" />
          <div className="relative flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-700 font-medium">{success}</span>
          </div>
        </div>
      )}
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
                  src={resolveAssetUrl(src)}
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
                    src={resolveAssetUrl(src)}
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

// Mobile sidebar link component
function MobileSideLink({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      className={`w-full text-left rounded-lg px-3 py-2.5 transition-all duration-200 ${
        active
          ? "bg-white/20 text-white font-semibold ring-1 ring-white/30 shadow-lg"
          : "text-white/90 hover:bg-white/10"
      } flex items-center gap-3`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
