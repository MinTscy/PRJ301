"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Headphones, Home, LoaderCircle, Radio, UserRound, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { SidebarProfile } from "@/components/sidebar-profile";
import { api, type AuthUser } from "@/lib/api";
import {
  ACTIVE_ROOM_SESSION_EVENT,
  clearActiveRoomSession,
  readActiveRoomSession,
  writeActiveRoomSession,
  type ActiveRoomSession
} from "@/lib/active-room-session";
import {
  AUTH_SESSION_EVENT,
  AUTH_TOKEN_KEY,
  clearAuthSession,
  readStoredUser,
  updateStoredUser
} from "@/lib/auth-session";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Discover", icon: Home },
  { href: "/rooms", label: "Rooms", icon: Radio },
  { href: "/podcasts", label: "Podcasts", icon: Headphones },
  { href: "/profile", label: "Profile", icon: UserRound }
];

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/auth";
  const [status, setStatus] = useState<AuthStatus>(
    isAuthPage ? "unauthenticated" : "checking"
  );
  const [activeUser, setActiveUser] = useState<AuthUser | null>(null);
  const [activeRoomSession, setActiveRoomSession] = useState<ActiveRoomSession | null>(null);

  const profileHref = activeUser ? `/profile/${activeUser.id}` : "/profile";
  const activeRoomHref = activeRoomSession
    ? `/rooms?roomCode=${encodeURIComponent(activeRoomSession.roomCode)}`
    : "/rooms";

  useEffect(() => {
    if (isAuthPage) {
      setStatus(readStoredUser() ? "authenticated" : "unauthenticated");
      return;
    }

    let cancelled = false;

    async function verifySession() {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = readStoredUser();
      if (!token || !storedUser) {
        if (!cancelled) {
          setActiveUser(null);
          setStatus("unauthenticated");
          router.replace("/auth");
        }
        return;
      }

      setStatus("checking");
      try {
        const currentUser = await api.me(token);
        if (cancelled) return;
        updateStoredUser(currentUser);
        setActiveUser(currentUser);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        clearAuthSession();
        setActiveUser(null);
        setStatus("unauthenticated");
        router.replace("/auth");
      }
    }

    void verifySession();
    return () => {
      cancelled = true;
    };
  }, [isAuthPage, pathname, router]);

  useEffect(() => {
    const handleSession = (event: Event) => {
      const user = (event as CustomEvent).detail ?? readStoredUser();
      if (user) {
        setActiveUser(user);
        setStatus("authenticated");
      } else {
        setActiveUser(null);
        setStatus("unauthenticated");
        if (pathname !== "/auth") router.replace("/auth");
      }
    };

    window.addEventListener(AUTH_SESSION_EVENT, handleSession);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, handleSession);
  }, [pathname, router]);

  useEffect(() => {
    setActiveRoomSession(readActiveRoomSession());

    const handleActiveRoom = (event: Event) => {
      setActiveRoomSession((event as CustomEvent<ActiveRoomSession | null>).detail ?? readActiveRoomSession());
    };

    window.addEventListener(ACTIVE_ROOM_SESSION_EVENT, handleActiveRoom);
    return () => window.removeEventListener(ACTIVE_ROOM_SESSION_EVENT, handleActiveRoom);
  }, []);

  useEffect(() => {
    if (!activeRoomSession || pathname === "/auth") return;

    let cancelled = false;
    api.roomByCode(activeRoomSession.roomCode)
      .then((room) => {
        if (cancelled) return;
        if (room.status === "ACTIVE") {
          writeActiveRoomSession(room);
        } else {
          clearActiveRoomSession(room.roomCode);
        }
      })
      .catch(() => {
        if (!cancelled) clearActiveRoomSession(activeRoomSession.roomCode);
      });

    return () => {
      cancelled = true;
    };
  }, [activeRoomSession?.roomCode, pathname]);

  if (isAuthPage) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto w-full max-w-6xl p-4 py-8 md:p-8 md:py-12">{children}</div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto size-9 animate-spin text-primary" />
          <p className="mt-4 text-sm font-bold text-muted-foreground">
            Checking your session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[288px_minmax(0,1fr)]">
      <aside className="hidden border-r border-white/[0.06] bg-lucy-sidebar/95 p-5 lg:sticky lg:top-0 lg:block lg:h-screen">
        <Link href="/" className="flex min-h-12 items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-lg font-black text-white shadow-glow">
            L
          </div>
          <div>
            <div className="text-3xl font-black leading-tight text-white">LUCY</div>
            <div className="text-sm font-black text-primary">Language Unity</div>
          </div>
        </Link>

        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => {
            const href = item.href === "/profile" ? profileHref : item.href;
            const active = item.href === "/profile" ? pathname.startsWith("/profile") : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex min-h-14 items-center gap-4 rounded-3xl px-5 text-lg font-black transition-colors",
                  active
                    ? "bg-primary/15 text-white"
                    : "text-muted-foreground hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-4 bottom-5">
          <div className="border-t border-white/10 pt-5">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              Learning
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["EN", "中文", "日本語"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs font-black text-primary"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <SidebarProfile />
        </div>
      </aside>

      <main className="min-w-0 pb-24 lg:pb-0">
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
          {activeRoomSession && pathname !== "/rooms" ? (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-200">
                    <Radio className="size-3.5" /> Active room
                  </span>
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {activeRoomSession.roomCode}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-black text-white">
                  {activeRoomSession.displayName} - Level {activeRoomSession.levelNumber}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={activeRoomHref}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Return <ArrowRight className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => clearActiveRoomSession(activeRoomSession.roomCode)}
                  className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:text-white"
                  aria-label="Dismiss active room"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-white/10 bg-lucy-sidebar/95 px-2 py-2 backdrop-blur-2xl lg:hidden">
        {navItems.map((item) => {
          const href = item.href === "/profile" ? profileHref : item.href;
          const active = item.href === "/profile" ? pathname.startsWith("/profile") : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors",
                active
                  ? "bg-primary/15 text-white"
                  : "text-muted-foreground hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="size-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
