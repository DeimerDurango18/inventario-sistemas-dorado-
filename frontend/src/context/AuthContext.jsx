import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { setToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const onLogout = () => logout();
    window.addEventListener("eticos:logout", onLogout);
    return () => window.removeEventListener("eticos:logout", onLogout);
  }, [logout]);

  useEffect(() => {
    const token = sessionStorage.getItem("eticos_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data.user ?? data))
      .catch(() => { setToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const permisos = new Set((user?.roles || []).flatMap((r) => r.permisos.map((p) => p.codigo)));
  const userPermisos = user ? [...permisos] : [];
  const can = useCallback((...codes) => codes.some((c) => permisos.has(c)), [permisos]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, can, permisos: userPermisos }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}