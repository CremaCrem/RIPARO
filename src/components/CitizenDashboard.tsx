import React, { useMemo, useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import { API_URL, resolveAssetUrl } from "../config";
import ReportCard from "./ReportCard";
import ReportTimeline from "./ReportTimeline";
import RIPARO_Logo from "../assets/RIPARO_Logo_White.png";
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

type TabKey = "dashboard" | "submit" | "track" | "profile" | "help";

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
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
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
              } rounded-lg px-3 py-2 text-white/90 outline-offset-2 transition-all duration-200 focus:outline-2 focus:outline-white hover:bg-white hover:text-black hover:scale-105 flex items-center gap-3 group`}
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
                      label: "Received",
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
                      label: "Disapprove",
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
                      case "Received":
                        animatedCount = animatedOpen;
                        break;
                      case "Assigned":
                        animatedCount = animatedAssigned;
                        break;
                      case "Resolved":
                        animatedCount = animatedResolved;
                        break;
                      case "Disapprove":
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
              <Panel description="Provide details so your LGU can act quickly.">
                <SubmitReport
                  userData={_userData}
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
              <Panel description="Follow the progress of your submissions.">
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
          {active === "profile" && (
            <section className="animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Panel description="Update your information and submit for verification.">
                <EditProfile userData={_userData} />
              </Panel>
            </section>
          )}
          {active === "help" && (
            <section className="animate-in fade-in duration-500 slide-in-from-bottom-4">
              <Panel description="Frequently asked questions and guidance.">
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
          onClose={() => {
            setDetailsReport(null);
            setShowFeedbackForm(false);
          }}
          size="2xl"
          actions={
            <div className="flex gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#0038A8] to-[#1e40af] px-4 py-2 text-sm font-medium text-white hover:from-[#1e40af] hover:to-[#1e3a8a] transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => {
                  setDetailsReport(null);
                  setShowFeedbackForm(false);
                }}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Back to Reports
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Report Details */}
            <div className="space-y-4">
              {/* Header Card */}
              <div className="relative rounded-xl bg-gradient-to-br from-[#0038A8]/5 via-[#FCD116]/5 to-white border border-slate-200 p-4">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        Report Details
                      </h3>
                      <p className="text-sm text-slate-600">
                        Submitted by {detailsReport.submitter_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          detailsReport.progress === "resolved"
                            ? "bg-emerald-100 text-emerald-700"
                            : detailsReport.progress === "assigned"
                            ? "bg-blue-100 text-blue-700"
                            : detailsReport.progress === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {detailsReport.progress === "in_review"
                          ? "In Review"
                          : detailsReport.progress === "rejected"
                          ? "Disapprove"
                          : detailsReport.progress.charAt(0).toUpperCase() +
                            detailsReport.progress.slice(1)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">
                        Category
                      </div>
                      <div className="font-semibold text-slate-800 capitalize">
                        {detailsReport.type.replaceAll("_", " ")}
                      </div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">
                        Submitted
                      </div>
                      <div className="font-semibold text-slate-800">
                        {new Date(
                          detailsReport.created_at
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#0038A8] rounded-full" />
                  Description
                </h4>
                <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {detailsReport.description}
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  Progress Timeline
                </h4>
                <ReportTimeline
                  status={detailsReport.progress}
                  dates={
                    {
                      submitted:
                        detailsReport.date_generated ||
                        detailsReport.created_at,
                      pending:
                        detailsReport.date_generated ||
                        detailsReport.created_at,
                      [detailsReport.progress]: detailsReport.updated_at,
                    } as any
                  }
                />
              </div>
            </div>

            {/* Right Column - Images & Feedback */}
            <div className="space-y-4">
              {/* Images Section */}
              {(Array.isArray(detailsReport.photos) &&
                detailsReport.photos.length > 0) ||
              (Array.isArray((detailsReport as any).resolution_photos) &&
                (detailsReport as any).resolution_photos.length > 0) ? (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Visual Evidence
                  </h4>
                  <div className="space-y-4">
                    {Array.isArray(detailsReport.photos) &&
                      detailsReport.photos.length > 0 && (
                        <div>
                          <div className="text-xs text-slate-500 mb-2 font-medium">
                            Before
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {detailsReport.photos
                              .slice(0, 4)
                              .map((photo, index) => (
                                <div
                                  key={index}
                                  className="aspect-video rounded-lg overflow-hidden border border-slate-200"
                                >
                                  <img
                                    src={resolveAssetUrl(photo)}
                                    alt={`Before ${index + 1}`}
                                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-200"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    {Array.isArray((detailsReport as any).resolution_photos) &&
                      (detailsReport as any).resolution_photos.length > 0 && (
                        <div>
                          <div className="text-xs text-slate-500 mb-2 font-medium">
                            After
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {(detailsReport as any).resolution_photos
                              .slice(0, 4)
                              .map((photo: string, index: number) => (
                                <div
                                  key={index}
                                  className="aspect-video rounded-lg overflow-hidden border border-slate-200"
                                >
                                  <img
                                    src={resolveAssetUrl(photo)}
                                    alt={`After ${index + 1}`}
                                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-200"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center">
                  <div className="text-slate-400 mb-2">
                    <svg
                      className="w-10 h-10 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500">No images available</p>
                </div>
              )}

              {/* Feedback Section */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  Feedback
                </h4>
                {!showFeedbackForm ? (
                  <div className="text-center py-3">
                    <div className="text-slate-400 mb-2">
                      <ChatBubbleLeftRightIcon className="w-6 h-6 mx-auto" />
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      Have feedback about this report?
                    </p>
                    <button
                      onClick={() => setShowFeedbackForm(true)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-[#0038A8] to-[#2563eb] hover:from-[#0038A8]/90 hover:to-[#2563eb]/90 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <ChatBubbleLeftRightIcon className="h-3 w-3" />
                      Send Feedback
                    </button>
                  </div>
                ) : (
                  <ReportFeedbackForm
                    reportId={detailsReport.report_id}
                    userEmail={_userData?.email || ""}
                    onNotice={(msg) => setNotice(msg)}
                    onClose={() => setShowFeedbackForm(false)}
                  />
                )}
              </div>
            </div>
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
  title?: string;
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
      {title && (
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
      )}
      {!title && description && (
        <div
          className={`relative px-6 py-5 border-b border-slate-100/50 rounded-t-2xl ${theme.header}`}
        >
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      )}
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

function SubmitReport({
  onSubmitted,
  onNotice,
  userData,
}: {
  onSubmitted: () => void;
  onNotice: (msg: string) => void;
  userData: any;
}) {
  const [isSelfReport, setIsSelfReport] = useState(true);
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

  // Auto-fill form when self-report is selected
  useEffect(() => {
    if (isSelfReport && userData) {
      setForm((prev) => ({
        ...prev,
        submitter_name: `${userData.first_name || ""} ${
          userData.middle_name || ""
        } ${userData.last_name || ""}`.trim(),
        address: `${userData.barangay || ""}, ${userData.zone || ""}`.replace(
          /^,\s*|,\s*$/g,
          ""
        ),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        submitter_name: "",
        address: "",
      }));
    }
  }, [isSelfReport, userData]);

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
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-[#0038A8] to-[#1e40af] rounded-lg">
          <DocumentPlusIcon className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Submit Report</h1>
      </div>

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

      {/* Report Type Toggle */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Report Type
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Choose who you're reporting for
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-medium transition-colors duration-200 ${
                !isSelfReport
                  ? "text-[#0038A8] font-semibold"
                  : "text-slate-400"
              }`}
            >
              On behalf of someone
            </span>
            <button
              type="button"
              onClick={() => setIsSelfReport(!isSelfReport)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                isSelfReport ? "bg-[#0038A8]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
                  isSelfReport ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium transition-colors duration-200 ${
                isSelfReport ? "text-[#0038A8] font-semibold" : "text-slate-400"
              }`}
            >
              Self report
            </span>
          </div>
        </div>
      </div>

      <form className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300">
        <label
          className={`block sm:col-span-1 ${
            touchedMissing.submitter_name ? "shake" : ""
          }`}
        >
          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
            {isSelfReport ? "Your name" : "Name of person submitting"}
          </span>
          <input
            name="submitter_name"
            value={form.submitter_name}
            onChange={handleChange}
            disabled={isSelfReport}
            className={`w-full rounded-lg border ${
              touchedMissing.submitter_name
                ? "border-red-400 bg-red-50"
                : isSelfReport
                ? "border-slate-300 bg-slate-50"
                : "border-slate-300 bg-white"
            } px-3 py-2 text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200`}
          />
        </label>

        <label
          className={`block sm:col-span-1 ${touchedMissing.age ? "shake" : ""}`}
        >
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

        <label
          className={`block sm:col-span-1 ${
            touchedMissing.gender ? "shake" : ""
          }`}
        >
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
          className={`block sm:col-span-3 ${
            touchedMissing.address ? "shake" : ""
          }`}
        >
          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
            {isSelfReport ? "Your address" : "Address"}
          </span>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            disabled={isSelfReport}
            className={`w-full rounded-lg border ${
              touchedMissing.address
                ? "border-red-400 bg-red-50"
                : isSelfReport
                ? "border-slate-300 bg-slate-50"
                : "border-slate-300 bg-white"
            } px-3 py-2 text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200`}
          />
        </label>

        <label
          className={`block sm:col-span-3 ${
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
          className={`block sm:col-span-3 ${
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

        <label className="block sm:col-span-3">
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

        <div className="sm:col-span-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
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
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    category: "",
    status: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Filter reports based on current filters
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Date filter
      if (filters.dateFrom) {
        const reportDate = new Date(report.created_at);
        const fromDate = new Date(filters.dateFrom);
        if (reportDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const reportDate = new Date(report.created_at);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (reportDate > toDate) return false;
      }

      // Category filter
      if (filters.category && report.type !== filters.category) return false;

      // Status filter
      if (filters.status && report.progress !== filters.status) return false;

      return true;
    });
  }, [reports, filters]);

  const clearFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      category: "",
      status: "",
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-[#0038A8] to-[#1e40af] rounded-lg">
          <ClipboardDocumentCheckIcon className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Track My Feedback</h1>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading && <div className="text-sm text-slate-600">Loading...</div>}
        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Integrated Filters */}
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Filters</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#0038A8] hover:bg-[#0038A8]/10 rounded-lg transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              {showFilters ? "Hide" : "Show"} Filters
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date From */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      handleFilterChange("dateFrom", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      handleFilterChange("dateTo", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) =>
                      handleFilterChange("category", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
                  >
                    <option value="">All Categories</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="sanitation">Sanitation</option>
                    <option value="community_welfare">Community welfare</option>
                    <option value="behavoural_concerns">
                      Behavioral concerns
                    </option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Received</option>
                    <option value="in_review">In Review</option>
                    <option value="assigned">Assigned</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Disapprove</option>
                  </select>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {filteredReports.length} of {reports.length} reports
                </div>
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

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
              {filteredReports.map((r) => {
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
      </div>
    </div>
  );
}

function EditProfile({ userData }: { userData?: any }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(() => ({
    first_name: userData?.first_name || "",
    middle_name: userData?.middle_name || "",
    last_name: userData?.last_name || "",
    email: userData?.email || "",
    mobile_number: userData?.mobile_number || "",
    barangay: userData?.barangay || "",
    zone: userData?.zone || "",
    password: "",
  }));
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [touchedMissing, setTouchedMissing] = useState<Record<string, boolean>>(
    {}
  );

  // Prefill when userData becomes available, but don't override if user already typed
  useEffect(() => {
    if (!userData) return;
    setForm((prev) => {
      const isAllEmpty =
        !prev.first_name &&
        !prev.middle_name &&
        !prev.last_name &&
        !prev.email &&
        !prev.mobile_number &&
        !prev.barangay &&
        !prev.zone &&
        !prev.password;
      if (!isAllEmpty) return prev;
      return {
        first_name: userData.first_name || "",
        middle_name: userData.middle_name || "",
        last_name: userData.last_name || "",
        email: userData.email || "",
        mobile_number: userData.mobile_number || "",
        barangay: userData.barangay || "",
        zone: userData.zone || "",
        password: "",
      };
    });
  }, [userData]);

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
      first_name: userData?.first_name || "",
      middle_name: userData?.middle_name || "",
      last_name: userData?.last_name || "",
      email: userData?.email || "",
      mobile_number: userData?.mobile_number || "",
      barangay: userData?.barangay || "",
      zone: userData?.zone || "",
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
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-[#0038A8] to-[#1e40af] rounded-lg">
          <UserCircleIcon className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Edit Profile</h1>
      </div>

      {success && <div className="mt-3 notice notice-success">{success}</div>}
      {error && <div className="mt-3 notice notice-error">{error}</div>}

      <form
        className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          // Validate first to show missing highlights before confirm
          const ok = validate();
          if (!ok) return;
          setShowConfirm(true);
        }}
      >
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm text-slate-700">First name</span>
          <input
            name="first_name"
            value={form.first_name}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block sm:col-span-1">
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

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm text-slate-700">Last name</span>
          <input
            name="last_name"
            value={form.last_name}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm text-slate-700">Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm text-slate-700">Barangay</span>
          <input
            name="barangay"
            value={form.barangay}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm text-slate-700">Zone</span>
          <input
            name="zone"
            value={form.zone}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 focus:border-slate-400"
          />
        </label>

        <label
          className={`block sm:col-span-3 ${
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

        <div className="sm:col-span-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
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
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-[#0038A8] to-[#1e40af] rounded-lg">
          <QuestionMarkCircleIcon className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Help & Support</h1>
      </div>
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
      : status === "rejected"
      ? "Disapprove"
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-xs text-slate-700 font-medium">{text}</span>
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

function ReportFeedbackForm({
  reportId,
  userEmail,
  onNotice,
  onClose,
}: {
  reportId: string;
  userEmail: string;
  onNotice: (msg: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    subject: `Feedback for Report ${reportId}`,
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touchedMissing, setTouchedMissing] = useState<Record<string, boolean>>(
    {}
  );

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const reset = () => {
    setForm({ subject: `Feedback for Report ${reportId}`, message: "" });
    setError(null);
    setSuccess(null);
    setTouchedMissing({});
  };

  const submit = async () => {
    // Simple client validation
    if (!form.message.trim()) {
      const errorMsg = "Please enter your feedback message.";
      setError(errorMsg);
      setTouchedMissing((t) => ({ ...t, message: true }));
      onNotice(`❌ ${errorMsg}`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        subject: form.subject,
        contact_email: userEmail,
        message: form.message,
        report_id: reportId, // Include report ID for context
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

      const msg = "✅ Feedback sent successfully!";
      setSuccess(msg);
      onNotice(msg);
      reset();
      onClose();
    } catch (e: any) {
      const errorMsg = e?.message || "Submission failed";
      setError(errorMsg);
      onNotice(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with close button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Send Feedback</h4>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Compact Form */}
      <div className="space-y-2">
        {/* Subject - Hidden, auto-generated */}
        <input
          name="subject"
          value={form.subject}
          onChange={onChange}
          className="hidden"
        />

        {/* Message Input */}
        <div className={touchedMissing.message ? "shake" : ""}>
          <textarea
            name="message"
            rows={3}
            value={form.message}
            onChange={onChange}
            placeholder="Share your feedback about this report..."
            className={`w-full rounded-lg border ${
              touchedMissing.message
                ? "border-red-400 bg-red-50"
                : "border-slate-300 bg-white"
            } px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/20 transition-all duration-200 resize-none`}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-500">Sending as: {userEmail}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={loading || !form.message.trim()}
              onClick={submit}
              className="rounded-md px-3 py-1.5 text-xs font-medium bg-[#0038A8] text-white hover:bg-[#0038A8]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Removed unused Input and FileInput helpers after wiring functional form
