import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../services/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  const logout = () => {
    setUser(null);
    api.post("/auth/logout").catch(() => {});
  };
  useEffect(() => {
    // Remove credentials and claim details left by older local-storage releases.
    localStorage.removeItem("getclaim-token");
    Object.keys(localStorage).filter(key => key.startsWith("getclaim-draft-")).forEach(key => localStorage.removeItem(key));
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    const expired = () => {
      logout();
      toast.info("You were signed out. Sign in to continue where you left off.", { id: "session-expired" });
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  const authenticate = async (path, data) => {
    const r = await api.post(`/auth/${path}`, data);
    if (r.data.mfaRequired) return r.data;
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
