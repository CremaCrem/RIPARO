// RIPARO/src/components/Auth.tsx
import { useEffect, useMemo, useState } from "react";
import bgSanJose from "../assets/san_jose_bg.jpg";

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

  const allowSignup = !loginOnly && role === "citizen";

  useEffect(() => {
    if (!allowSignup && mode !== "login") {
      setMode("login");
    }
  }, [allowSignup, mode]);

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
    if (role === "mayor") return "Mayor Login";
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

  // Role-based visual theming and cues (Philippine flag colors)
  const theme = useMemo(() => {
    const common = {
      bannerBg: "bg-[#0038A8]/20 border-[#0038A8]/30", // blue
      chipBg: "bg-[#FCD116]", // yellow
      chipText: "text-[#1f2937]", // slate-800 for readability
      ring: "ring-2 ring-[#FCD116]/40",
      glow: "shadow-[0_0_80px_10px_rgba(0,56,168,0.15)]",
      navActive: "text-white font-semibold border-b-2 border-[#FCD116]",
      stripBg: "bg-[#0038A8]",
      stripText: "text-white",
    } as const;

    if (role === "admin")
      return { ...common, label: "Admin Portal", emoji: "🛡️" } as const;
    if (role === "mayor")
      return { ...common, label: "Mayor Portal", emoji: "🏛️" } as const;
    return { ...common, label: "Citizen Portal", emoji: "☀️" } as const; // sun for citizens
  }, [role]);

  const isSignup = allowSignup && mode === "signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({}); // Clear previous errors

    try {
      if (mode === "login") {
        const response = await fetch(`http://localhost:8000/api/login`, {
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

        const response = await fetch(`http://localhost:8000/api/register`, {
          method: "POST",
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
    <div className="relative min-h-screen w-full text-white flex flex-col">
      {/* Background image */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgSanJose})` }}
      />
      {/* Philippine flag overlay: blue to red with subtle vignette */}
      <div className="absolute inset-0 -z-[9] bg-gradient-to-br from-[#0038A8]/85 via-[#0038A8]/50 to-[#CE1126]/85" />
      <div className="absolute inset-0 -z-[8] bg-black/10" />

      <header className="px-6 md:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#FCD116] flex items-center justify-center text-[#0038A8] font-black">
            RP
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">RIPARO</p>
            <p className="text-xs text-white/70 leading-none mt-0.5">
              Report. Process. Resolve.
            </p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
          <a
            className={`transition-colors hover:text-white ${
              role === "citizen" ? theme.navActive : ""
            }`}
            href="#/login/citizen"
          >
            Citizen
          </a>
          <a
            className={`transition-colors hover:text-white ${
              role === "mayor" ? theme.navActive : ""
            }`}
            href="#/login/mayor"
          >
            Mayor
          </a>
          <a
            className={`transition-colors hover:text-white ${
              role === "admin" ? theme.navActive : ""
            }`}
            href="#/login/admin"
          >
            Admin
          </a>
        </nav>
      </header>

      {/* Role banner */}
      <div className="px-6 md:px-10">
        <div
          className={`mx-auto w-full max-w-6xl mb-3 rounded-xl border ${theme.bannerBg} ${theme.glow}`}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <span className="text-lg">{theme.emoji}</span>
              <span className="text-sm font-semibold tracking-wide">
                You are in the {theme.label}
              </span>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs ${theme.chipBg} ${theme.chipText}`}
            >
              {role?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <main className="px-6 md:px-10 py-6 flex-1">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 lg:grid-cols-2 gap-8">
          {!isSignup && (
            <section className="hidden lg:flex flex-col justify-center">
              <div className="relative">
                <h1 className="mt-0 text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight">
                  Reporting System of Barangay San Jose, Camarines Sur.
                  <br />
                  <span className="text-white/90">Making Reporting Easier</span>
                </h1>

                <p className="mt-4 text-white/80 text-base leading-relaxed max-w-prose">
                  Submit reports about infrastructure, public safety, and
                  community concerns. Your barangay receives, validates, and
                  acts.
                </p>
              </div>
            </section>
          )}

          <section
            className={`flex items-center ${isSignup ? "lg:col-span-2" : ""}`}
          >
            <div className="w-full">
              <div
                className={`mx-auto w-full ${
                  isSignup ? "max-w-4xl" : "max-w-md"
                } rounded-2xl border border-slate-200 bg-white p-6 ${
                  theme.ring
                }`}
              >
                {/* Role strip */}
                <div
                  className={`-mx-6 -mt-6 px-6 py-2 rounded-t-2xl flex items-center gap-2 ${theme.stripBg} ${theme.stripText}`}
                >
                  <span className="text-base">{theme.emoji}</span>
                  <span className="text-xs uppercase tracking-wider font-semibold">
                    {theme.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                  <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                    <button
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        mode === "login"
                          ? "bg-[#0038A8] text-white font-semibold"
                          : "text-slate-700 hover:bg-[#0038A8]/10"
                      }`}
                      onClick={() => {
                        setMode("login");
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
                      }}
                    >
                      Log in
                    </button>
                    {allowSignup && (
                      <button
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          mode === "signup"
                            ? "bg-[#0038A8] text-white font-semibold"
                            : "text-slate-700 hover:bg-[#0038A8]/10"
                        }`}
                        onClick={() => {
                          setMode("signup");
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
                        }}
                      >
                        Sign up
                      </button>
                    )}
                  </div>
                </div>

                <p className="mt-2 text-sm text-slate-600">{subtitle}</p>

                {/* Helper text */}
                {allowSignup && mode === "signup" && (
                  <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    Please complete all fields marked with{" "}
                    <span className="text-red-500">*</span>. A valid ID upload
                    is required for signup.
                  </div>
                )}

                <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
                  {allowSignup && mode === "signup" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label
                          className={`block ${
                            errors.first_name ? "shake" : ""
                          }`}
                        >
                          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
                            First name
                          </span>
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
                            className={`w-full rounded-lg border px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 transition ${
                              errors.first_name
                                ? "border-red-400 bg-red-50"
                                : "border-slate-300 bg-white focus:border-slate-400"
                            }`}
                          />
                          {errors.first_name && (
                            <p className="mt-1 text-xs text-red-600">
                              {errors.first_name}
                            </p>
                          )}
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm text-slate-700">
                            Middle name (optional)
                          </span>
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
                            className="w-full rounded-lg border px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 transition border-slate-300 bg-white focus:border-slate-400"
                          />
                        </label>
                        <label
                          className={`block ${errors.last_name ? "shake" : ""}`}
                        >
                          <span className="mb-1 block text-sm text-slate-700 required-asterisk">
                            Last name
                          </span>
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
                            className={`w-full rounded-lg border px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 transition ${
                              errors.last_name
                                ? "border-red-400 bg-red-50"
                                : "border-slate-300 bg-white focus:border-slate-400"
                            }`}
                          />
                          {errors.last_name && (
                            <p className="mt-1 text-xs text-red-600">
                              {errors.last_name}
                            </p>
                          )}
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                          shake={!!errors.email}
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
                          shake={!!errors.mobile_number}
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

                      <div className="grid grid-cols-2 gap-3 items-start">
                        <label className="mb-1.5 block text-sm text-slate-700 required-asterisk">
                          Upload valid ID
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              if (idPreview) URL.revokeObjectURL(idPreview);
                              setIdDoc(f);
                              setIdPreview(f ? URL.createObjectURL(f) : null);
                            }}
                            className="w-full rounded-lg border px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 transition border-slate-300 bg-white focus:border-slate-400"
                          />
                          {idDoc && (
                            <button
                              type="button"
                              onClick={() => {
                                if (idPreview) URL.revokeObjectURL(idPreview);
                                setIdDoc(null);
                                setIdPreview(null);
                              }}
                              className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-600 border border-red-200"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {errors.id_document && (
                          <div className="col-span-2">
                            <p className="text-xs text-red-600">
                              {errors.id_document}
                            </p>
                          </div>
                        )}
                        {idPreview && (
                          <div className="mt-2">
                            <img
                              src={idPreview}
                              alt="ID preview"
                              className="h-24 rounded-md border border-slate-200 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {!isSignup && (
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
                      shake={!!errors.email}
                    />
                  )}

                  <div>
                    <label
                      className={`mb-1.5 block text-sm text-slate-700 ${
                        errors.password ? "shake" : ""
                      }`}
                    >
                      <span className="required-asterisk">Password</span>
                    </label>
                    <div className="relative">
                      <input
                        className={`w-full rounded-lg border px-3 py-2 pr-10 text-slate-800 placeholder-slate-400 outline-none ring-0 transition ${
                          errors.password
                            ? "border-red-400 bg-red-50"
                            : "border-slate-300 bg-white focus:border-slate-400"
                        }`}
                        type={showPassword ? "text" : "password"}
                        placeholder={
                          mode === "login"
                            ? "Your password"
                            : "Create a strong password"
                        }
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* General error message */}
                  {errors.general && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{errors.general}</p>
                    </div>
                  )}

                  {mode === "login" && (
                    <div className="flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 bg-white"
                        />
                        <span className="text-slate-600">Remember me</span>
                      </label>
                      <a
                        href="#"
                        className="text-slate-600 hover:text-slate-800 underline underline-offset-4"
                      >
                        Forgot password?
                      </a>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#0038A8] px-4 py-2 font-semibold text-white transition hover:bg-[#1e3a8a] active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading
                      ? "Loading..."
                      : mode === "login"
                      ? "Log in"
                      : "Create account"}
                    <span className="transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </button>

                  {allowSignup && (
                    <div className="pt-2 text-center text-xs text-slate-600">
                      {mode === "login" ? (
                        <>
                          Don’t have an account?{" "}
                          <button
                            onClick={() => setMode("signup")}
                            className="underline underline-offset-4 hover:text-slate-800"
                          >
                            Sign up
                          </button>
                        </>
                      ) : (
                        <>
                          Already have an account?{" "}
                          <button
                            onClick={() => setMode("login")}
                            className="underline underline-offset-4 hover:text-slate-800"
                          >
                            Log in
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </form>
              </div>

              <p className="mt-4 text-center text-xs text-slate-600">
                By continuing, you confirm your reports are truthful and
                accurate to the best of your knowledge.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="px-6 md:px-10 py-8 text-xs text-white/60">
        © {new Date().getFullYear()} RIPARO • A citizen reporting platform for
        LGUs in the Philippines
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
  shake?: boolean;
}) {
  return (
    <div>
      <label
        className={`mb-1.5 block text-sm text-slate-700 ${
          props.shake ? "shake" : ""
        }`}
      >
        <span className={props.requiredAsterisk ? "required-asterisk" : ""}>
          {props.label}
        </span>
      </label>
      <input
        type={props.type || "text"}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
        className={`w-full rounded-lg border px-3 py-2 text-slate-800 placeholder-slate-400 outline-none ring-0 transition ${
          props.error
            ? "border-red-400 bg-red-50"
            : "border-slate-300 bg-white focus:border-slate-400"
        }`}
      />
      {props.error && (
        <p className="mt-1 text-xs text-red-600">{props.error}</p>
      )}
    </div>
  );
}
