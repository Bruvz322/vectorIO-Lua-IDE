import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "menu_dev";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("session_token"));
  const [loading, setLoading] = useState(true);

  const validateSession = useCallback(async (t: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("auth", {
        body: { action: "validate", token: t },
      });
      if (error || data?.error) {
        localStorage.removeItem("session_token");
        setToken(null);
        setUser(null);
      } else {
        setUser(data.user);
      }
    } catch {
      localStorage.removeItem("session_token");
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      validateSession(token);
    } else {
      setLoading(false);
    }
  }, [token, validateSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("auth", {
        body: { action: "login", email, password },
      });
      if (error || data?.error) {
        return { error: data?.error || "Login failed" };
      }
      localStorage.setItem("session_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await supabase.functions.invoke("auth", {
          body: { action: "logout", token },
        });
      } catch {
        // Ignore logout errors
      }
    }
    localStorage.removeItem("session_token");
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
