import React, { useMemo, useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import { API_URL } from "../config";
import ReportCard from "./ReportCard";
import ReportTimeline from "./ReportTimeline";
import RIPARO_Logo from "../assets/RIPARO_Logo.png";
import {
  HomeIcon,
  DocumentPlusIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDoubleRightIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

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
  const [collapsed, setCollapsed] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [myReports, setMyReports] = useState<ApiReport[]>([]);
  const [resolvedFeed, setResolvedFeed] = useState<ApiReport[]>([]);
  const [loadingResolved, setLoadingResolved] = useState(false);
  const [resolvedError, setResolvedError] = useState<string | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [detailsReport, setDetailsReport] = useState<ApiReport | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Calculate real dashboard statistics
  const dashboardStats = useMemo(() => {
    const open = myReports.filter(
      (r) => r.progress === "pending" || r.progress === "in_review"
    ).length;
    const assigned = myReports.filter((r) => r.progress === "assigned").length;
    const resolved = myReports.filter((r) => r.progress === "resolved").length;
    const rejected = myReports.filter((r) => r.progress === "rejected").length;
    return { open, assigned, resolved, rejected };
  }, [myReports]);

  // const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const recentCards = useMemo(() => resolvedFeed.slice(0, 12), [resolvedFeed]);

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
  const animatedOpen = useAnimatedCounter(dashboardStats.open);
  const animatedAssigned = useAnimatedCounter(dashboardStats.assigned);
  const animatedResolved = useAnimatedCounter(dashboardStats.resolved);
  const animatedRejected = useAnimatedCounter(dashboardStats.rejected);

  useEffect(() => {
    const load = async () => {
      setLoadingReports(true);
      setReportsError(null);
      try {
        const token = localStorage.getItem("auth_token") || "";
        const res = await fetch(`${API_URL}/my-reports`, {
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

  // load global resolved feed for dashboard (shared view)
  useEffect(() => {
    const loadResolved = async () => {
      setLoadingResolved(true);
      setResolvedError(null);
      try {
        const params = new URLSearchParams();
        params.set("per_page", "12");
        params.set("page", "1");
        const res = await fetch(
          `${API_URL}/public/reports?${params.toString()}`
        );
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message || "Failed to load resolved feed");
        const items: ApiReport[] = Array.isArray(data.data)
          ? data.data
          : data.reports || [];
        setResolvedFeed(items);
      } catch (e: any) {
        setResolvedError(e?.message || "Failed to load resolved feed");
      } finally {
        setLoadingResolved(false);
      }
    };
    loadResolved();
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800">
      {/* Mobile Header */}
      <header className="lg:hidden bg-[#0e2a7a] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={RIPARO_Logo}
            alt="RIPARO"
            className="h-8 w-8 object-contain filter brightness-0 invert"
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
                  className="h-10 w-10 object-contain filter brightness-0 invert"
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
                  active={active === "dashboard"}
                  icon={<HomeIcon className="h-5 w-5" />}
                  onClick={() => {
                    setActive("dashboard");
                    setMobileMenuOpen(false);
                  }}
                />
                <MobileSideLink
                  label="Submit Report"
                  active={active === "submit"}
                  icon={<DocumentPlusIcon className="h-5 w-5" />}
                  onClick={() => {
                    setActive("submit");
                    setMobileMenuOpen(false);
                  }}
                />
                <MobileSideLink
                  label="Track My Report"
                  active={active === "track"}
                  icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />}
                  onClick={() => {
                    setActive("track");
                    setMobileMenuOpen(false);
                  }}
                />
                <MobileSideLink
                  label="Feedback"
                  active={active === "feedback"}
                  icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
                  onClick={() => {
                    setActive("feedback");
                    setMobileMenuOpen(false);
                  }}
                />
                <MobileSideLink
                  label="Edit Profile"
                  active={active === "profile"}
                  icon={<UserCircleIcon className="h-5 w-5" />}
                  onClick={() => {
                    setActive("profile");
                    setMobileMenuOpen(false);
                  }}
                />
                <MobileSideLink
                  label="Help"
                  active={active === "help"}
                  icon={<QuestionMarkCircleIcon className="h-5 w-5" />}
                  onClick={() => {
                    setActive("help");
                    setMobileMenuOpen(false);
                  }}
                />
                <button
                  className="w-full text-left rounded-lg px-3 py-2.5 text-white/90 transition-all duration-200 hover:bg-white/10 flex items-center gap-3 mt-4"
                  onClick={() => {
                    setShowLogout(true);
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
          <div className="relative px-3 py-4 border-b border-white/10">
            <div className="flex items-center justify-center">
              {collapsed ? (
                <img
                  src={RIPARO_Logo}
                  alt="RIPARO"
                  className="h-8 w-8 object-contain filter brightness-0 invert"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <img
                    src={RIPARO_Logo}
                    alt="RIPARO"
                    className="h-10 w-10 object-contain filter brightness-0 invert"
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
              active={active === "dashboard"}
              icon={<HomeIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setActive("dashboard")}
            />
            <SideLink
              label="Submit Report"
              active={active === "submit"}
              icon={<DocumentPlusIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setActive("submit")}
            />
            <SideLink
              label="Track My Report"
              active={active === "track"}
              icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setActive("track")}
            />
            <SideLink
              label="Feedback"
              active={active === "feedback"}
              icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setActive("feedback")}
            />
            <SideLink
              label="Edit Profile"
              active={active === "profile"}
              icon={<UserCircleIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setActive("profile")}
            />
            <SideLink
              label="Help"
              active={active === "help"}
              icon={<QuestionMarkCircleIcon className="h-5 w-5" />}
              collapsed={collapsed}
              onClick={() => setActive("help")}
            />
            <button
              className={`mt-4 w-full ${
                collapsed ? "justify-center" : "text-left"
              } rounded-lg px-3 py-2 text-white/90 outline-offset-2 transition-all duration-200 focus:outline-2 focus:outline-[#FCD116] hover:bg-white/10 hover:scale-105 flex items-center gap-3 group`}
              onClick={() => setShowLogout(true)}
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

          {notice && (
            <div className="mb-4 relative rounded-xl border border-emerald-300 bg-emerald-50/90 backdrop-blur-md px-4 py-3 shadow-lg animate-in slide-in-from-top-2 duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent rounded-xl" />
              <div className="relative flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-700 font-medium">{notice}</span>
              </div>
            </div>
          )}
          {active === "dashboard" && (
            <section className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
              <div className="relative rounded-2xl bg-white/90 backdrop-blur-lg border border-slate-200 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.2)] transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8]/5 via-transparent to-[#FCD116]/5 rounded-2xl" />
                <div className="relative px-6 py-5 overflow-hidden rounded-t-2xl">
                  <div className="absolute inset-0 -z-10 opacity-30 bg-gradient-to-r from-[#2563eb]/10 via-[#0038A8]/10 to-[#001a57]/10 animate-pulse" />
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
                    Welcome, {userName}! 👋
                  </h1>
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Barangay Kinalansan, Zone 4 • Verified
                  </p>
                </div>
                <div className="px-4 sm:px-6 pb-5 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    {
                      label: "Open",
                      color: "bg-gradient-to-r from-amber-400 to-amber-500",
                      icon: ClockIcon,
                      count: dashboardStats.open,
                      bgColor: "bg-amber-50",
                      borderColor: "border-amber-200",
                    },
                    {
                      label: "Assigned",
                      color: "bg-gradient-to-r from-blue-500 to-blue-600",
                      icon: ClipboardDocumentCheckIcon,
                      count: dashboardStats.assigned,
                      bgColor: "bg-blue-50",
                      borderColor: "border-blue-200",
                    },
                    {
                      label: "Resolved",
                      color: "bg-gradient-to-r from-emerald-500 to-emerald-600",
                      icon: CheckCircleIcon,
                      count: dashboardStats.resolved,
                      bgColor: "bg-emerald-50",
                      borderColor: "border-emerald-200",
                    },
                    {
                      label: "Rejected",
                      color: "bg-gradient-to-r from-red-500 to-red-600",
                      icon: XCircleIcon,
                      count: dashboardStats.rejected,
                      bgColor: "bg-red-50",
                      borderColor: "border-red-200",
                    },
                  ].map((s, i) => {
                    // Get the corresponding animated count
                    let animatedCount;
                    switch (s.label) {
                      case "Open":
                        animatedCount = animatedOpen;
                        break;
                      case "Assigned":
                        animatedCount = animatedAssigned;
                        break;
                      case "Resolved":
                        animatedCount = animatedResolved;
                        break;
                      case "Rejected":
                        animatedCount = animatedRejected;
                        break;
                      default:
                        animatedCount = s.count;
                    }

                    return (
                      <div
                        key={i}
                        className={`group relative rounded-xl border ${s.borderColor} ${s.bgColor} p-3 sm:p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 overflow-hidden`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <div className="relative flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-semibold text-slate-700">
                            {s.label}
                          </span>
                          <div
                            className={`p-1.5 sm:p-2 rounded-lg ${s.color} shadow-sm`}
                          >
                            <s.icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-extrabold text-slate-900 transition-all duration-300 group-hover:text-slate-800">
                          {animatedCount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Recently resolved across the municipality
                  </h2>
                </div>
                <div className="p-6">
                  {resolvedError && (
                    <div className="mb-4 notice notice-error">
                      {resolvedError}
                    </div>
                  )}
                  {loadingResolved ? (
                    <div className="text-sm text-slate-600">Loading…</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentCards.map((r) => (
                        <ReportCard
                          key={r.report_id}
                          reportId={r.report_id}
                          title={r.submitter_name}
                          status={r.progress}
                          thumbUrl={r.photos?.[0]}
                          afterUrl={(r as any).resolution_photos?.[0]}
                          createdAt={r.created_at}
                          meta={`${r.type.replaceAll("_", " ")} • ${r.address}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
          {active === "submit" && (
            <section className="animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Panel
                title="Submit Report"
                description="Provide details so your LGU can act quickly."
              >
                <SubmitReport
                  onNotice={(msg) => setNotice(msg)}
                  onSubmitted={() => {
                    (async () => {
                      try {
                        const token = localStorage.getItem("auth_token") || "";
                        const res = await fetch(`${API_URL}/my-reports`, {
                          headers: token
                            ? { Authorization: `Bearer ${token}` }
                            : {},
                        });
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
              </Panel>
            </section>
          )}
          {active === "track" && (
            <section className="animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Panel
                title="Track My Report"
                description="Follow the progress of your submissions."
              >
                <TrackFeedback
                  loading={loadingReports}
                  error={reportsError}
                  reports={myReports}
                  highlightId={highlightId}
                  setRowRef={(id, el) => (rowRefs.current[id] = el)}
                  onView={(r) => openDetails(r)}
                />
              </Panel>
            </section>
          )}
          {active === "feedback" && (
            <section className="animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Panel
                title="Submit Feedback"
                description="Help us improve services with your suggestions."
              >
                <FeedbackForm onNotice={(msg) => setNotice(msg)} />
              </Panel>
            </section>
          )}
          {active === "profile" && (
            <section className="animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Panel
                title="Edit Profile"
                description="Update your information and submit for verification."
              >
                <EditProfile />
              </Panel>
            </section>
          )}
          {active === "help" && (
            <section className="animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Panel
                title="Help & Support"
                description="Frequently asked questions and guidance."
              >
                <HelpContent />
              </Panel>
            </section>
          )}
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

function Panel({
  title,
  description,
  children,
  tone = "blue",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "blue" | "amber" | "emerald" | "violet" | "indigo";
}) {
  const map: Record<string, { header: string; ring: string; accent: string }> =
    {
      blue: {
        header:
          "bg-gradient-to-r from-[#eaf1ff] via-[#e6eeff] to-white/90 backdrop-blur-sm",
        ring: "ring-1 ring-[#2563eb1f]",
        accent: "border-t-4 border-[#0038A8]",
      },
      amber: {
        header:
          "bg-gradient-to-r from-[#fff7e6] via-[#fff1d6] to-white/90 backdrop-blur-sm",
        ring: "ring-1 ring-[#f59e0b1f]",
        accent: "border-t-4 border-amber-500",
      },
      emerald: {
        header:
          "bg-gradient-to-r from-[#e7fff5] via-[#dffbef] to-white/90 backdrop-blur-sm",
        ring: "ring-1 ring-[#10b9811f]",
        accent: "border-t-4 border-emerald-500",
      },
      violet: {
        header:
          "bg-gradient-to-r from-[#f3e8ff] via-[#efe1ff] to-white/90 backdrop-blur-sm",
        ring: "ring-1 ring-[#7c3aed1f]",
        accent: "border-t-4 border-violet-500",
      },
      indigo: {
        header:
          "bg-gradient-to-r from-[#eaeaff] via-[#e3e7ff] to-white/90 backdrop-blur-sm",
        ring: "ring-1 ring-[#4f46e51f]",
        accent: "border-t-4 border-indigo-500",
      },
    };
  const theme = map[tone] || map.blue;
  return (
    <div
      className={`group relative rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.2)] transition-all duration-300 ${theme.ring} ${theme.accent}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 rounded-2xl" />
      <div
        className={`relative px-6 py-5 border-b border-slate-100/50 rounded-t-2xl ${theme.header}`}
      >
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-600">{description}</p>
        )}
      </div>
      <div className="relative p-6">{children}</div>
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
        } rounded-lg px-3 py-2.5 transition-all duration-200 outline-offset-2 focus:outline-2 focus:outline-[#FCD116] ${
          active
            ? "bg-white/20 text-white font-semibold ring-1 ring-white/30 shadow-lg transform scale-105 animate-pulse"
            : "text-white/90 hover:bg-white/10 hover:scale-105 hover:shadow-md"
        } flex items-center gap-3 relative overflow-hidden`}
        onClick={onClick}
      >
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-[#FCD116]/20 via-transparent to-[#FCD116]/20 animate-pulse" />
        )}
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
      const res = await fetch(`${API_URL}/reports`, {
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

      <form className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300">
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
                ? "border-red-400 bg-red-50"
                : "border-slate-300 bg-white"
            } px-3 py-2 text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200`}
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
              touchedMissing.age
                ? "border-red-400 bg-red-50"
                : "border-slate-300 bg-white"
            } px-3 py-2 text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200`}
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
              touchedMissing.gender
                ? "border-red-400 bg-red-50"
                : "border-slate-300 bg-white"
            } px-3 py-2 text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200`}
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </label>

        <label
          className={`block sm:col-span-2 ${
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
              touchedMissing.address
                ? "border-red-400 bg-red-50"
                : "border-slate-300 bg-white"
            } px-3 py-2 text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200`}
          />
        </label>

        <label
          className={`block sm:col-span-2 ${
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
              touchedMissing.type
                ? "border-red-400 bg-red-50"
                : "border-slate-300 bg-white"
            } px-3 py-2 text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200`}
          >
            <option value="">Select...</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="sanitation">Sanitation</option>
            <option value="community_welfare">Community welfare</option>
            <option value="behavoural_concerns">Behavoural concerns</option>
          </select>
        </label>

        <label
          className={`block sm:col-span-2 ${
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
              touchedMissing.description
                ? "border-red-400 bg-red-50"
                : "border-slate-300 bg-white"
            } px-3 py-2 text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200`}
          />
        </label>

        <label className="block sm:col-span-2">
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

        <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
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
                <th className="py-2 text-xs sm:text-sm">Submission ID</th>
                <th className="py-2 text-xs sm:text-sm hidden sm:table-cell">
                  Date Submitted
                </th>
                <th className="py-2 text-xs sm:text-sm">Category</th>
                <th className="py-2 text-xs sm:text-sm hidden md:table-cell">
                  Address
                </th>
                <th className="py-2 text-xs sm:text-sm">Status</th>
                <th className="py-2 text-xs sm:text-sm">Actions</th>
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
                    <td className="py-2 font-mono text-[10px] sm:text-[12px]">
                      {r.report_id}
                    </td>
                    <td className="py-2 hidden sm:table-cell text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 capitalize text-xs">
                      {r.type.replaceAll("_", " ")}
                    </td>
                    <td className="py-2 hidden md:table-cell text-xs">
                      {r.address}
                    </td>
                    <td className="py-2">
                      <StatusPill status={r.progress as any} />
                    </td>
                    <td className="py-2">
                      <button
                        className="text-[#0038A8] underline underline-offset-4 text-xs"
                        onClick={() => onView(r)}
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
      const res = await fetch(`${API_URL}/feedback`, {
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
      const res = await fetch(`${API_URL}/profile/update-request`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
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
        className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          // Validate first to show missing highlights before confirm
          const ok = validate();
          if (!ok) return;
          setShowConfirm(true);
        }}
      >
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm text-slate-700">First name</span>
          <input
            name="first_name"
            value={form.first_name}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block sm:col-span-2">
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

        <label className="block sm:col-span-2">
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
          className={`block sm:col-span-2 ${
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

        <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
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

// Removed unused Input and FileInput helpers after wiring functional form
