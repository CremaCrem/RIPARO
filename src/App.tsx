import { useState, useEffect } from "react";
import Auth from "./components/Auth";
import CitizenDashboard from "./components/CitizenDashboard";
import StaffDashboard from "./components/StaffDashboard";
import MayorDashboard from "./components/MayorDashboard";

type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  barangay: string;
  zone: string;
  role?: "citizen" | "admin" | "mayor";
};

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hash, setHash] = useState<string>(window.location.hash || "");

  useEffect(() => {
    // Check if user is already logged in on app load
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
        setLoggedIn(true);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash || "");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    setLoggedIn(false);
  };

  const handleAuthenticated = (userData: User) => {
    setUser(userData);
    setLoggedIn(true);
  };

  const getAuthRoleFromHash = (): "citizen" | "admin" | "mayor" => {
    const h = (hash || window.location.hash || "").toLowerCase();
    if (h.includes("#/login/mayor")) return "mayor";
    if (h.includes("#/login/admin")) return "admin";
    return "citizen";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!loggedIn) {
    const roleForLogin = getAuthRoleFromHash();
    const isLoginOnly = roleForLogin === "admin" || roleForLogin === "mayor";
    return (
      <Auth
        onAuthenticated={handleAuthenticated}
        role={roleForLogin}
        loginOnly={isLoginOnly}
      />
    );
  }

  // Route to dashboard based on role
  const role = user?.role || "citizen";
  if (role === "mayor") {
    return <MayorDashboard onLogout={handleLogout} />;
  }
  if (role === "admin") {
    return <StaffDashboard onLogout={handleLogout} />;
  }
  return (
    <CitizenDashboard
      userName={`${user?.first_name} ${user?.last_name}`}
      userData={user}
      onLogout={handleLogout}
    />
  );
}

export default App;
