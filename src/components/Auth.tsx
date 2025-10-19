// RIPARO/src/components/Auth.tsx
import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../config";
import bgSanJose from "../assets/san_jose_bg.jpg";
import RIPARO_Logo from "../assets/RIPARO_Logo.png";

type Mode = "login" | "signup";

type FormData = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  password: string;
  mobile_number: string;
  barangay: string;
  zone: string;
};

export default function Auth({
  onAuthenticated,
  role = "citizen",
  loginOnly = false,
}: {
  onAuthenticated: (user: any) => void; // Change this to pass user data
  role?: "citizen" | "admin" | "mayor";
  loginOnly?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    password: "",
    mobile_number: "",
    barangay: "",
    zone: "",
  });

  // ID document for verification during signup
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allowSignup = !loginOnly && role === "citizen";

  useEffect(() => {
    if (!allowSignup && mode !== "login") {
      setMode("login");
    }
  }, [allowSignup, mode]);

  // Close mobile menu when role changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [role]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest("[data-mobile-menu]")) {
          setMobileMenuOpen(false);
        }
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [mobileMenuOpen]);

  // Reset portal-specific state when role changes (citizen/admin/mayor) or mode changes
  useEffect(() => {
    setErrors({});
    setFormData({
      first_name: "",
      middle_name: "",
      last_name: "",
      email: "",
      password: "",
      mobile_number: "",
      barangay: "",
      zone: "",
    });
    setIdDoc(null);
    if (idPreview) URL.revokeObjectURL(idPreview);
    setIdPreview(null);
  }, [role, mode]);

  const title = useMemo(() => {
    if (mode === "signup") return "Create your account";
    if (role === "mayor") return "Mayor's Login";
    if (role === "admin") return "Admin Login";
    return "Welcome back";
  }, [mode, role]);

  const subtitle = useMemo(() => {
    if (mode === "signup") {
      return "Sign up to RIPARO to directly submit reports to your LGU and get updates fast.";
    }
    if (role === "mayor" || role === "admin") {
      return "Sign in with your assigned credentials.";
    }
    return "Sign in to RIPARO to file, track, and follow up reports to your LGU.";
  }, [mode, role]);

  // Role-based visual theming inspired by Camarines Sur and Philippine government
  const theme = useMemo(() => {
    const common = {
      bannerBg:
        "bg-gradient-to-r from-[#0038A8]/10 to-[#CE1126]/10 border-[#0038A8]/20",
      chipBg: "bg-gradient-to-r from-[#FCD116] to-[#FFD700]",
      chipText: "text-[#1f2937] font-semibold",
      ring: "ring-2 ring-[#0038A8]/20",
      glow: "shadow-[0_0_40px_8px_rgba(0,56,168,0.08)]",
      navActive:
        "text-white font-semibold border-b-2 border-[#FCD116] bg-[#0038A8]/20",
      stripBg: "bg-gradient-to-r from-[#0038A8] to-[#1e40af]",
      stripText: "text-white",
      icon: "",
      accent: "text-[#0038A8]",
    } as const;

    if (role === "admin")
      return {
        ...common,
        label: "Administrative Portal",
        icon: "⚖️",
        description: "Manage and oversee municipal operations",
      } as const;
    if (role === "mayor")
      return {
        ...common,
        label: "Mayor's Dashboard",
        icon: "🏛️",
        description: "Executive oversight and decision making",
      } as const;
    return {
      ...common,
      label: "Citizen Portal",
      icon: "👥",
      description: "Submit reports and track municipal services",
    } as const;
  }, [role]);

  // Removed isSignup variable - using mode === "signup" directly

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({}); // Clear previous errors

    try {
      if (mode === "login") {
        const response = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Enforce role-based login: the user's role must match the selected form
          const loggedInUser = data.user;
          const userRole = (loggedInUser?.role || "citizen") as
            | "citizen"
            | "admin"
            | "mayor";

          if (userRole !== role) {
            // Do NOT persist token or user if role mismatches the selected portal
            setErrors({
              general:
                role === "citizen"
                  ? "This portal is for Citizens only. Please use the correct login page for your role."
                  : role === "admin"
                  ? "This portal is for Admins only. Please use the correct login page for your role."
                  : "This portal is for the Mayor only. Please use the correct login page for your role.",
            });
          } else {
            localStorage.setItem("auth_token", data.token);
            localStorage.setItem("user", JSON.stringify(loggedInUser));
            onAuthenticated(loggedInUser);
          }
        } else {
          // Handle verification gating messages
          if (data?.status === "pending") {
            setErrors({ general: "Your account is still under review." });
          } else if (data?.status === "rejected") {
            setErrors({ general: "Your registration was rejected." });
          } else if (data?.errors) {
            setErrors(data.errors);
          } else {
            setErrors({ general: data?.message || "Login failed" });
          }
        }
      } else {
        // signup with multipart/form-data (includes required id document)
        // simple client-side required validation for UX
        const requiredFields = [
          "first_name",
          "last_name",
          "email",
          "password",
          "mobile_number",
          "barangay",
          "zone",
        ] as const;
        const localErrors: Record<string, string> = {};
        const missingFlags: Record<string, boolean> = {};
        requiredFields.forEach((key) => {
          const value = (formData as any)[key];
          if (!String(value || "").trim()) {
            localErrors[key] = "This field is required";
            missingFlags[key] = true;
          }
        });
        if (!idDoc) {
          localErrors.id_document = "Valid ID document is required";
          missingFlags.id_document = true;
        }
        if (Object.keys(localErrors).length > 0) {
          setErrors(localErrors);
          setLoading(false);
          return;
        }

        const fd = new FormData();
        fd.append("first_name", formData.first_name);
        if (formData.middle_name)
          fd.append("middle_name", formData.middle_name);
        fd.append("last_name", formData.last_name);
        fd.append("email", formData.email);
        fd.append("password", formData.password);
        fd.append("mobile_number", formData.mobile_number);
        fd.append("barangay", formData.barangay);
        fd.append("zone", formData.zone);
        if (idDoc) fd.append("id_document", idDoc);

        const response = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: fd,
        });

        const data = await response.json();

        if (response.ok) {
          // After successful signup, switch to login mode
          setMode("login");
          setFormData((prev) => ({
            ...prev,
            email: formData.email,
            password: "",
          }));
          setIdDoc(null);
          if (idPreview) URL.revokeObjectURL(idPreview);
          setIdPreview(null);
          setErrors({
            general:
              "✅ Account created. Please log in. Verification is pending.",
          });
        } else {
          if (data.errors) setErrors(data.errors);
          else setErrors({ general: data?.message || "Signup failed" });
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen md:h-screen w-full flex flex-col md:overflow-hidden">
      {/* Background image with Philippine flag overlay */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgSanJose})` }}
      />
      {/* Philippine flag overlay: blue to red with translucent effect */}
      <div className="absolute inset-0 -z-[9] bg-gradient-to-br from-[#0038A8]/85 via-[#0038A8]/50 to-[#CE1126]/85" />
      <div className="absolute inset-0 -z-[8] bg-black/10" />

      {/* Decorative elements inspired by Filipino architecture */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0038A8] via-[#FCD116] to-[#CE1126]" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#0038A8]" />

      <header className="sticky top-0 z-50 md:static px-4 md:px-6 lg:px-8 py-2 md:py-3 bg-white/95 backdrop-blur-sm border-b border-slate-200/50 w-full">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={RIPARO_Logo}
                alt="RIPARO Logo"
                className="h-12 w-12 md:h-14 md:w-14 object-contain"
                onError={(e) => {
                  // Fallback to text logo if image fails to load
                  const target = e.currentTarget as HTMLImageElement;
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (target) target.style.display = "none";
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div
                className="h-12 w-12 md:h-14 md:w-14 rounded-lg bg-gradient-to-br from-[#0038A8] to-[#1e40af] flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg"
                style={{ display: "none" }}
              >
                R
              </div>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800 leading-none">
                RIPARO
              </h1>
              <p className="text-xs text-slate-600 leading-none mt-0.5 font-medium">
                Report • Process • Resolve
              </p>
              <p className="hidden md:block text-[10px] text-slate-500 leading-none mt-0.5">
                Barangay San Jose, Camarines Sur
              </p>
            </div>
          </div>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <a
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                role === "citizen"
                  ? "bg-[#0038A8] text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:text-[#0038A8] hover:bg-white/50"
              }`}
              href="#/login/citizen"
            >
              Citizen Portal
            </a>
            <a
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                role === "mayor"
                  ? "bg-[#0038A8] text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:text-[#0038A8] hover:bg-white/50"
              }`}
              href="#/login/mayor"
            >
              Mayor's Office
            </a>
            <a
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                role === "admin"
                  ? "bg-[#0038A8] text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:text-[#0038A8] hover:bg-white/50"
              }`}
              href="#/login/admin"
            >
              Administration
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            aria-label="Toggle mobile menu"
            data-mobile-menu
          >
            <svg
              className="w-6 h-6 text-slate-600"
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
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className="md:hidden bg-white border-b border-slate-200/50 shadow-lg"
          data-mobile-menu
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col gap-2">
              <a
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  role === "citizen"
                    ? "bg-[#0038A8] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#0038A8] hover:bg-slate-50"
                }`}
                href="#/login/citizen"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-lg">👥</span>
                </div>
                <div>
                  <div className="font-semibold">Citizen Portal</div>
                  <div className="text-xs opacity-75">
                    Submit reports and track services
                  </div>
                </div>
              </a>
              <a
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  role === "mayor"
                    ? "bg-[#0038A8] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#0038A8] hover:bg-slate-50"
                }`}
                href="#/login/mayor"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-lg">🏛️</span>
                </div>
                <div>
                  <div className="font-semibold">Mayor's Office</div>
                  <div className="text-xs opacity-75">
                    Executive oversight and decisions
                  </div>
                </div>
              </a>
              <a
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  role === "admin"
                    ? "bg-[#0038A8] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#0038A8] hover:bg-slate-50"
                }`}
                href="#/login/admin"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-lg">⚖️</span>
                </div>
                <div>
                  <div className="font-semibold">Administration</div>
                  <div className="text-xs opacity-75">
                    Manage municipal operations
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Role banner */}
      <div className="px-4 md:px-6 lg:px-8 py-2 md:py-2.5">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0038A8] to-[#1e40af] px-4 md:px-5 py-2 md:py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <span className="text-base md:text-lg">{theme.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-sm md:text-base font-bold text-white">
                      {theme.label}
                    </h2>
                    <p className="text-[10px] md:text-xs text-white/80">
                      {theme.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 md:px-6 lg:px-8 py-3 md:py-4 flex-1 md:overflow-y-auto">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center h-full">
            {mode !== "signup" && (
              <section className="hidden lg:flex flex-col justify-center">
                <div className="space-y-3 md:space-y-4">
                  <div className="space-y-2 md:space-y-3">
                    <h1 className="text-2xl md:text-3xl xl:text-4xl font-bold text-white leading-tight">
                      Digital Governance for
                      <span className="block text-[#FCD116]">
                        Barangay San Jose
                      </span>
                    </h1>
                    <p className="text-sm md:text-base text-white/90 leading-relaxed">
                      A modern reporting system connecting citizens with local
                      government in Camarines Sur. Submit, track, and resolve
                      community concerns efficiently.
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className={`${mode === "signup" ? "lg:col-span-2" : ""}`}>
              <div className="w-full max-w-md mx-auto lg:max-w-none">
                <div className="bg-white rounded-xl shadow-xl border border-slate-200/50 overflow-hidden">
                  <div className="px-5 md:px-6 py-3 md:py-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-slate-800">
                        {title}
                      </h2>
                      <p className="text-xs md:text-sm text-slate-600 mt-0.5">
                        {subtitle}
                      </p>
                    </div>

                    {/* Login/Signup Toggle - Only show for citizen portal */}
                    {allowSignup && (
                      <div className="mt-3 md:mt-4">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => setMode("login")}
                            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                              mode === "login"
                                ? "bg-gradient-to-r from-[#0038A8] to-[#1e40af] text-white shadow-sm"
                                : "text-slate-600 hover:text-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                                />
                              </svg>
                              Sign In
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMode("signup")}
                            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                              mode === "signup"
                                ? "bg-gradient-to-r from-[#0038A8] to-[#1e40af] text-white shadow-sm"
                                : "text-slate-600 hover:text-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                                />
                              </svg>
                              Create Account
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Helper text */}
                  {allowSignup && mode === "signup" && (
                    <div className="px-5 md:px-6 py-2.5 bg-amber-50 border-l-4 border-amber-400">
                      <div className="flex items-start gap-2">
                        <svg
                          className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.725-1.36 3.49 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-xs text-amber-700">
                          <strong>Note:</strong> Complete all fields marked with{" "}
                          <span className="text-red-500 font-semibold">*</span>.
                          A valid government-issued ID is required for
                          verification.
                        </p>
                      </div>
                    </div>
                  )}

                  <form
                    className="px-5 md:px-6 py-3 md:py-4 space-y-3"
                    onSubmit={handleSubmit}
                  >
                    {allowSignup && mode === "signup" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                              First name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Juan"
                              value={formData.first_name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  first_name: e.target.value,
                                })
                              }
                              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#0038A8]/20 ${
                                errors.first_name
                                  ? "border-red-400 bg-red-50 focus:border-red-400"
                                  : "border-slate-300 bg-white focus:border-[#0038A8]"
                              }`}
                            />
                            {errors.first_name && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <svg
                                  className="h-4 w-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {errors.first_name}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                              Middle name{" "}
                              <span className="text-slate-400">(optional)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Santos"
                              value={formData.middle_name || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  middle_name: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#0038A8]/20 focus:border-[#0038A8]"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                              Last name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Dela Cruz"
                              value={formData.last_name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  last_name: e.target.value,
                                })
                              }
                              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#0038A8]/20 ${
                                errors.last_name
                                  ? "border-red-400 bg-red-50 focus:border-red-400"
                                  : "border-slate-300 bg-white focus:border-[#0038A8]"
                              }`}
                            />
                            {errors.last_name && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <svg
                                  className="h-4 w-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {errors.last_name}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="Email address"
                            type="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                            error={errors.email}
                            requiredAsterisk
                          />
                          <Input
                            label="Mobile number"
                            type="tel"
                            placeholder="09xx xxx xxxx"
                            value={formData.mobile_number}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                mobile_number: e.target.value,
                              })
                            }
                            error={errors.mobile_number}
                            requiredAsterisk
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="Barangay"
                            type="text"
                            placeholder="San Jose"
                            value={formData.barangay}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                barangay: e.target.value,
                              })
                            }
                            error={errors.barangay}
                            requiredAsterisk
                          />
                          <Input
                            label="Zone"
                            type="text"
                            placeholder="Zone 1"
                            value={formData.zone}
                            onChange={(e) =>
                              setFormData({ ...formData, zone: e.target.value })
                            }
                            error={errors.zone}
                            requiredAsterisk
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                              Government-issued ID{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const f = e.target.files?.[0] || null;
                                  if (idPreview) URL.revokeObjectURL(idPreview);
                                  setIdDoc(f);
                                  setIdPreview(
                                    f ? URL.createObjectURL(f) : null
                                  );
                                }}
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#0038A8]/20 focus:border-[#0038A8] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#0038A8]/10 file:text-[#0038A8] hover:file:bg-[#0038A8]/20"
                              />
                              {idDoc && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (idPreview)
                                      URL.revokeObjectURL(idPreview);
                                    setIdDoc(null);
                                    setIdPreview(null);
                                  }}
                                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            {errors.id_document && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <svg
                                  className="h-4 w-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {errors.id_document}
                              </p>
                            )}
                          </div>
                          {idPreview && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-slate-700 mb-1.5">
                                ID Preview:
                              </p>
                              <img
                                src={idPreview}
                                alt="ID preview"
                                className="h-24 w-auto rounded-lg border border-slate-200 object-cover shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {mode !== "signup" && (
                      <Input
                        label="Email address"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        error={errors.email}
                        requiredAsterisk
                      />
                    )}

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#0038A8]/20 ${
                            errors.password
                              ? "border-red-400 bg-red-50 focus:border-red-400"
                              : "border-slate-300 bg-white focus:border-[#0038A8]"
                          }`}
                          type={showPassword ? "text" : "password"}
                          placeholder={
                            mode === "login"
                              ? "Enter your password"
                              : "Create a strong password"
                          }
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 px-4 text-slate-500 hover:text-slate-700 transition-colors"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.password}
                        </p>
                      )}
                    </div>

                    {/* General error message */}
                    {errors.general && (
                      <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-red-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700 font-medium">
                              {errors.general}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {mode === "login" && (
                      <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-[#0038A8] focus:ring-[#0038A8]/20"
                          />
                          <span className="text-slate-600">Remember me</span>
                        </label>
                        <a
                          href="#"
                          className="text-[#0038A8] hover:text-[#1e40af] font-medium transition-colors"
                        >
                          Forgot password?
                        </a>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full group inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0038A8] to-[#1e40af] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:from-[#1e40af] hover:to-[#1e3a8a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      {loading ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          {mode === "login" ? "Sign In" : "Create Account"}
                          <svg
                            className="h-5 w-5 transition-transform group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="px-4 md:px-6 lg:px-8 py-2 md:py-2.5 bg-white/95 backdrop-blur-sm border-t border-slate-200/50 md:mt-auto w-full">
        <div className="w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            <div className="text-center md:text-left">
              <p className="text-xs text-slate-800 font-medium">
                © {new Date().getFullYear()} RIPARO
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Digital governance platform for Barangay San Jose, Camarines Sur
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-600">
              <span>Report • Process • Resolve</span>
              <div className="h-3 w-px bg-slate-300" />
              <span>Philippines</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Input(props: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  requiredAsterisk?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {props.label}{" "}
        {props.requiredAsterisk && <span className="text-red-500">*</span>}
      </label>
      <input
        type={props.type || "text"}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#0038A8]/20 ${
          props.error
            ? "border-red-400 bg-red-50 focus:border-red-400"
            : "border-slate-300 bg-white focus:border-[#0038A8]"
        }`}
      />
      {props.error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {props.error}
        </p>
      )}
    </div>
  );
}
