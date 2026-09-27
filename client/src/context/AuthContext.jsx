import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../services/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  const logout = () => {
    localStorage.removeItem("getclaim-token");
    setUser(null);
  };
  useEffect(() => {
    if (localStorage.getItem("getclaim-token"))
      api
        .get("/auth/me")
        .then((r) => setUser(r.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    else setLoading(false);
    const expired = () => {
      logout();
      toast.info("You were signed out. Sign in to continue where you left off.", { id: "session-expired" });
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => {
    const token = localStorage.getItem("getclaim-token");
    if (!token) return;
    try {
      const expiry = JSON.parse(atob(token.split(".")[1])).exp * 1000;
      const timer = setTimeout(() => {
        logout();
        toast.info("You were signed out after a period of inactivity. Sign in to continue where you left off.", { id: "session-expired" });
      }, Math.max(0, expiry - Date.now()));
      return () => clearTimeout(timer);
    } catch {
      logout();
    }
  }, [user]);
  const authenticate = async (path, data) => {
    const r = await api.post(`/auth/${path}`, data);
    localStorage.setItem("getclaim-token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };
  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, logout, authenticate }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
