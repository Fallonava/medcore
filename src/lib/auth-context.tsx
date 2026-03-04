"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SessionPayload as UserSession } from "./auth-shared";

interface LoginResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  canRead: (resource: string) => boolean;
  canWrite: (resource: string) => boolean;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  canRead: () => false,
  canWrite: () => false,
  isSuperAdmin: false,
  refresh: async () => {},
  login: async () => ({ success: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else if (res.status === 401) {
        // Try silent token refresh
        const data = await res.json().catch(() => ({}));
        if (data?.code === "TOKEN_EXPIRED") {
          const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
          if (refreshRes.ok) {
            // Retry fetching user with the new access token
            const retryRes = await fetch("/api/auth/me");
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              setUser(retryData.user);
              return;
            }
          }
        }
        setUser(null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    // Proactively refresh the access token every 13 minutes (2 min before 15m expiry)
    const interval = setInterval(async () => {
      await fetch("/api/auth/refresh", { method: "POST" });
    }, 13 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchUser]);

  const isSuperAdmin = user?.roleName === "Super Admin";

  const canRead = useCallback(
    (resource: string) => {
      if (!user) return false;
      if (isSuperAdmin) return true;
      return user.permissions.some((p) => p.resource === resource && (p.action === "read" || p.action === "write"));
    },
    [user, isSuperAdmin]
  );

  const canWrite = useCallback(
    (resource: string) => {
      if (!user) return false;
      if (isSuperAdmin) return true;
      return user.permissions.some((p) => p.resource === resource && p.action === "write");
    },
    [user, isSuperAdmin]
  );

  // ─── Centralized Login ───
  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (res.ok) {
          // Re-fetch session immediately so sidebar & all consumers update
          await fetchUser();
          // Navigate to dashboard
          router.push("/");
          router.refresh();
          return { success: true };
        }

        const data = await res.json();
        return { success: false, error: data.error || "Username atau password salah" };
      } catch {
        return { success: false, error: "Terjadi kesalahan jaringan. Periksa koneksi Anda." };
      }
    },
    [fetchUser, router]
  );

  // ─── Centralized Logout ───
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Proceed even if API call fails
    }
    setUser(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, canRead, canWrite, isSuperAdmin, refresh: fetchUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
