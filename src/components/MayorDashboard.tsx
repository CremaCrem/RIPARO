import React, { useMemo, useState, useEffect } from "react";
import Modal from "./Modal";
import ReportCard from "./ReportCard";
import { API_URL } from "../config";
import RIPARO_Logo from "../assets/RIPARO_Logo.png";
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

type MayorTab =
  | "dashboard"
  | "reports"
  | "feedback"
  | "users"
  | "updates"
  | "resolved";
type StatCard = {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor?: string;
  borderColor?: string;
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
  submitter_name?: string;
  photos?: string[] | null;
  resolution_photos?: string[] | null;
  address?: string;
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
  const [pendingUpdateRequests, setPendingUpdateRequests] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(
    {}
  );

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

  // Close mobile menu when tab changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [tab]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        mobileMenuOpen &&
        !target.closest("[data-mobile-menu]") &&
        !target.closest("[data-mobile-menu]")
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [mobileMenuOpen]);

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

  // Resolved reports state
  const [resolvedReports, setResolvedReports] = useState<ReportRow[]>([]);
  const [resolvedLoading, setResolvedLoading] = useState(false);
  const [resolvedError, setResolvedError] = useState<string | null>(null);
  const [resolvedPage, setResolvedPage] = useState(1);
  const [resolvedPerPage, setResolvedPerPage] = useState(12);
  const [resolvedTotal, setResolvedTotal] = useState(0);

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
        color: "bg-gradient-to-r from-amber-400 to-amber-500",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
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

  // Load resolved reports when tab changes
  useEffect(() => {
    if (tab !== "resolved") return;
    const load = async () => {
      setResolvedLoading(true);
      setResolvedError(null);
      try {
        const token = localStorage.getItem("auth_token") || "";
        const params = new URLSearchParams();
        params.set("page", String(resolvedPage));
        params.set("per_page", String(resolvedPerPage));
        params.set("status", "resolved");
        const res = await fetch(`${API_URL}/reports?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message || "Failed to load resolved reports");
        const items: ReportRow[] = Array.isArray(data.data)
          ? data.data
          : data.reports || [];
        setResolvedReports(items);
        const total =
          typeof data.total === "number" ? data.total : items.length;
        setResolvedTotal(total);
      } catch (e: any) {
        setResolvedError(e?.message || "Failed to load resolved reports");
      } finally {
        setResolvedLoading(false);
      }
    };
    load();
  }, [tab, resolvedPage, resolvedPerPage]);

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
          data-mobile-menu
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
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-[#0e2a7a] text-white shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8">
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

              <nav className="space-y-2">
                <MobileSideLink
                  label="Dashboard"
                  active={tab === "dashboard"}
                  icon={<HomeIcon className="h-5 w-5" />}
                  onClick={() => setTab("dashboard")}
                />
                <MobileSideLink
                  label="Reports"
                  active={tab === "reports"}
                  icon={<DocumentTextIcon className="h-5 w-5" />}
                  onClick={() => setTab("reports")}
                />
                <MobileSideLink
                  label="Feedback"
                  active={tab === "feedback"}
                  icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
                  onClick={() => setTab("feedback")}
                />
                <MobileSideLink
                  label="Users"
                  active={tab === "users"}
                  icon={<UserGroupIcon className="h-5 w-5" />}
                  onClick={() => setTab("users")}
                />
                <MobileSideLink
                  label="Update Requests"
                  active={tab === "updates"}
                  icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                  onClick={() => setTab("updates")}
                />
                <MobileSideLink
                  label="Resolved Reports"
                  active={tab === "resolved"}
                  icon={<CheckCircleIcon className="h-5 w-5" />}
                  onClick={() => setTab("resolved")}
                />
                <MobileSideLink
                  label="Logout"
                  active={false}
                  icon={<ArrowRightOnRectangleIcon className="h-5 w-5" />}
                  onClick={() => setConfirmLogout(true)}
                />
              </nav>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        <aside
          className={`${
            collapsed ? "w-16" : "w-64"
          } shrink-0 bg-[#0e2a7a] text-white relative overflow-hidden transition-all duration-300 ease-in-out hidden lg:block`}
        >
          <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-[#2563eb] via-[#0038A8] to-[#001a57] animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-[#FCD116]/5" />

          {/* Logo Section */}
          <div className="relative px-3 py-4 border-b border-white/10">
            <div className="flex items-center justify-center">
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
            <SideLink
              label="Resolved Reports"
              active={tab === "resolved"}
              icon={<CheckCircleIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setTab("resolved")}
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
                      Welcome, {mayorName}! 👋
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

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
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
                <div className="group relative rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="relative flex items-center justify-between">
                    <div className="text-xs sm:text-sm font-semibold text-slate-700">
                      Total Feedback
                    </div>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm">
                      <InboxIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
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
                      <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 transition-all duration-300 group-hover:text-slate-800">
                    {statsLoading ? "…" : animatedPendingUsers.toLocaleString()}
                  </div>
                </div>
                <div className="group relative rounded-xl border border-purple-200 bg-purple-50 p-3 sm:p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="relative flex items-center justify-between">
                    <div className="text-xs sm:text-sm font-semibold text-slate-700">
                      Update Requests Pending
                    </div>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 shadow-sm">
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
              <div className="mt-4 relative rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-3 sm:p-5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.2)] transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 rounded-2xl" />
                <div className="relative">
                  <h2 className="text-sm font-semibold text-slate-700 mb-3">
                    Reports by category ({timeRange})
                  </h2>
                  <div className="h-64 sm:h-80 md:h-96 lg:h-[28rem] xl:h-[32rem]">
                    <ChartBar dataMap={categoryCounts} loading={statsLoading} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === "reports" && (
            <section className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Citizen Reports
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full md:w-auto">
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
                    <table className="w-full text-xs sm:text-sm">
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
                      onPage={(p: number) => setReportPage(p)}
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
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full md:w-auto">
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
                      onPage={(p: number) => setFeedbackPage(p)}
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
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="text-left text-slate-600">
                      <tr>
                        <th className="py-2">Name</th>
                        <th className="py-2 hidden sm:table-cell">Email</th>
                        <th className="py-2 hidden md:table-cell">
                          Barangay/Zone
                        </th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-slate-100">
                          <td className="py-2">
                            <div className="sm:hidden">
                              <div className="font-medium">
                                {u.first_name} {u.last_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {u.email}
                              </div>
                              <div className="text-xs text-slate-500">
                                {u.barangay || ""} {u.zone ? `• ${u.zone}` : ""}
                              </div>
                            </div>
                            <div className="hidden sm:block">
                              {u.first_name} {u.last_name}
                            </div>
                          </td>
                          <td className="py-2 hidden sm:table-cell">
                            {u.email}
                          </td>
                          <td className="py-2 hidden md:table-cell">
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
                  <table className="w-full text-xs sm:text-sm">
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
                              <div className="hidden sm:block">
                                {new Date(u.created_at).toLocaleString()}
                              </div>
                              <div className="sm:hidden">
                                {new Date(u.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-2">
                              {u.user
                                ? `${u.user.first_name} ${u.user.last_name}`
                                : `#${u.user_id}`}
                            </td>
                            <td className="py-2">
                              <div className="hidden sm:block">
                                {changes.length ? changes.join(", ") : "-"}
                              </div>
                              <div className="sm:hidden text-xs">
                                {changes.length
                                  ? `${changes.length} change(s)`
                                  : "-"}
                              </div>
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

          {tab === "resolved" && (
            <section className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Resolved Reports
                  </h2>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
                      value={resolvedPerPage}
                      onChange={(e) => {
                        setResolvedPage(1);
                        setResolvedPerPage(
                          parseInt(e.target.value || "12", 10)
                        );
                      }}
                    >
                      <option value="12">12 / page</option>
                      <option value="24">24 / page</option>
                      <option value="48">48 / page</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="px-0 md:px-5 py-3 text-sm text-slate-600">
                    {resolvedLoading
                      ? "Loading..."
                      : resolvedError || `${resolvedTotal} resolved report(s)`}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {resolvedReports.map((r) => (
                      <ReportCard
                        key={r.id}
                        reportId={r.report_id}
                        title={r.submitter_name || r.report_id}
                        status={r.progress}
                        thumbUrl={r.photos?.[0]}
                        afterUrl={r.resolution_photos?.[0]}
                        createdAt={r.created_at}
                        meta={`${r.type.replaceAll("_", " ")} • ${
                          r.address || ""
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50 btn hover:bg-slate-50 transition-all duration-200"
                      onClick={() => setResolvedPage((p) => Math.max(1, p - 1))}
                      disabled={resolvedPage <= 1}
                    >
                      Prev
                    </button>
                    <Pagination
                      summaryTotal={resolvedTotal}
                      perPage={resolvedPerPage}
                      page={resolvedPage}
                      onPage={(p: number) => setResolvedPage(p)}
                    />
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50 btn hover:bg-slate-50 transition-all duration-200"
                      onClick={() => setResolvedPage((p) => p + 1)}
                      disabled={resolvedReports.length < resolvedPerPage}
                    >
                      Next
                    </button>
                  </div>
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
    <div className="h-full w-full">
      {loading && <div className="text-sm text-slate-600 mb-2">Loading…</div>}
      {labels.length === 0 ? (
        <div className="text-sm text-slate-500">No data</div>
      ) : (
        <Bar data={data} options={options} />
      )}
    </div>
  );
}

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
