"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getToken, setToken as save, clearToken as clear } from "@/lib/token-store";
import { getMe, type Me } from "@/lib/api";

interface TokenCtx {
  token: string | null;
  user: Me | null;
  loading: boolean;
  setToken: (t: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const Ctx = createContext<TokenCtx | null>(null);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(null);
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: pick up `?token=` deep-link or stored token, validate.
  useEffect(() => {
    let active = true;
    (async () => {
      let t: string | null = null;
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        const param = url.searchParams.get("token");
        if (param) {
          save(param);
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.toString());
          t = param;
        } else {
          t = getToken();
        }
      }
      if (!t) {
        if (active) setLoading(false);
        return;
      }
      try {
        const me = await getMe(t);
        if (!active) return;
        setTok(t);
        setUser(me);
      } catch {
        if (!active) return;
        clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setToken = useCallback(async (t: string) => {
    try {
      const me = await getMe(t);
      save(t);
      setTok(t);
      setUser(me);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Invalid token" };
    }
  }, []);

  const logout = useCallback(() => {
    clear();
    setTok(null);
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ token, user, loading, setToken, logout }}>
      {children}
    </Ctx.Provider>
  );
}

// Default context returned when called outside a <TokenProvider>.
// Next.js App Router prerenders pages like `/_not-found` outside the user's
// root layout, so any hook that hard-throws here breaks the static export.
const NOOP_CTX: TokenCtx = {
  token: null,
  user: null,
  loading: false,
  setToken: async () => ({ ok: false, error: "Not initialized" }),
  logout: () => {},
};

export function useToken(): TokenCtx {
  const c = useContext(Ctx);
  return c ?? NOOP_CTX;
}
