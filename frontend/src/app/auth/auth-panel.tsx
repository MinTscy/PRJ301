"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { API_BASE_URL, type AccountRole, type AuthResponse, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearAuthSession,
  persistAuthSession,
  updateStoredUser
} from "@/lib/auth-session";

const roles: Array<{ value: AccountRole; label: string; helper: string }> = [
  { value: "LUCY", label: "LUCY", helper: "Anonymous learner room access" },
  { value: "LUCY_PRO", label: "Pro", helper: "Mentor room and material tools" },
  { value: "LUCY_SUPER", label: "Super", helper: "Premium content workflow" }
];

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("mentor@lucy.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [displayName, setDisplayName] = useState("LUCY Mentor");
  const [role, setRole] = useState<AccountRole>("LUCY_PRO");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const savedUser = window.localStorage.getItem(AUTH_USER_KEY);
    if (savedToken) setToken(savedToken);
    if (savedUser) {
      setUser(JSON.parse(savedUser) as AuthUser);
    }
  }, []);

  function persistSession(response: AuthResponse) {
    setToken(response.accessToken);
    setUser(response.user);
    persistAuthSession(response.accessToken, response.user);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response =
        mode === "register"
          ? await authRequest<AuthResponse>("/api/auth/register", {
              method: "POST",
              body: JSON.stringify({ email, password, displayName, role })
            })
          : await authRequest<AuthResponse>("/api/auth/login", {
              method: "POST",
              body: JSON.stringify({ email, password })
            });
      persistSession(response);
      setMessage(mode === "register" ? "Account created and signed in." : "Signed in successfully.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshMe() {
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const currentUser = await authRequest<AuthUser>("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(currentUser);
      updateStoredUser(currentUser);
      setMessage("Session verified.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to verify session.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (token) {
      await authRequest<void>("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => undefined);
    }
    setToken(null);
    setUser(null);
    clearAuthSession();
    setMessage("Signed out.");
    router.replace("/auth");
    router.refresh();
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {mode === "login" ? <LogIn className="size-5 text-emerald-300" /> : <UserPlus className="size-5 text-emerald-300" />}
            {mode === "login" ? "Login" : "Register"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-5 inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                mode === "login" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
              }`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                mode === "register" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
              }`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <form className="grid gap-4" onSubmit={submit}>
            {mode === "register" ? (
              <label className="grid gap-2 text-sm font-bold text-white">
                Display name
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
            ) : null}
            <label className="grid gap-2 text-sm font-bold text-white">
              Email
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-white">
              Password
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>

            {mode === "register" ? (
              <div className="grid gap-3 md:grid-cols-3">
                {roles.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRole(item.value)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      role === item.value
                        ? "border-primary/45 bg-primary/15 ring-4 ring-primary/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <div className="font-black text-white">{item.label}</div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.helper}</p>
                  </button>
                ))}
              </div>
            ) : null}

            <Button type="submit" disabled={loading}>
              {mode === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
              {loading ? "Working..." : mode === "login" ? "Login" : "Create account"}
            </Button>
          </form>

          {message ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-muted-foreground">
              {message}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-300" />
            Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-white">{user.displayName}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={user.role === "LUCY" ? "teal" : user.role === "LUCY_PRO" ? "violet" : "coral"}>
                    {user.role}
                  </Badge>
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] p-3 font-mono text-xs text-muted-foreground">
                  {user.personaId}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" onClick={refreshMe} disabled={loading}>
                  <Sparkles className="size-4" /> Verify
                </Button>
                <Button type="button" variant="outline" onClick={logout}>
                  <LogOut className="size-4" /> Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-sm leading-6 text-muted-foreground">
              No active local session. Login or register to create a database-backed session.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
