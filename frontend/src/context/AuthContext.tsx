import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, setAuthToken } from "@/src/api/client";

type User = { id: string; name: string; email: string; email_verified: boolean };

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
const TOKEN_KEY = "legacy_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await storage.secureGet(TOKEN_KEY, "");
      if (saved) {
        setAuthToken(saved as string);
        try {
          const me = await api.me();
          setUser(me);
          setToken(saved as string);
        } catch {
          setAuthToken(null);
          await storage.secureRemove(TOKEN_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (accessToken: string, u: User) => {
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(u);
    await storage.secureSet(TOKEN_KEY, accessToken);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    await persist(res.access_token, res.user);
  }, [persist]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password });
    await persist(res.access_token, res.user);
  }, [persist]);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await storage.secureRemove(TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
