"use client";

import Link from "next/link";
import { Settings, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/api";
import {
  AUTH_SESSION_EVENT,
  AUTH_USER_KEY,
  readStoredUser
} from "@/lib/auth-session";

function initials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length ? parts.map((part) => part[0]?.toUpperCase()).join("") : "?";
}

function roleLabel(user: AuthUser) {
  if (user.role === "LUCY_SUPER") return "Super";
  if (user.role === "LUCY_PRO") return "Pro";
  return "Learner";
}

export function SidebarProfile() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(readStoredUser());

    const handleSession = (event: Event) => {
      setUser((event as CustomEvent<AuthUser | null>).detail ?? readStoredUser());
    };
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === AUTH_USER_KEY) setUser(readStoredUser());
    };

    window.addEventListener(AUTH_SESSION_EVENT, handleSession);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, handleSession);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <Link
      href={user ? `/profile/${user.id}` : "/profile"}
      className="mt-5 flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.05] p-3 transition-colors hover:bg-white/[0.08]"
    >
      <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-black text-white">
        {user ? initials(user.displayName) : <UserRound className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-black text-white">
          {user?.displayName ?? "Guest"}
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-black ${
            user?.role === "LUCY_SUPER"
              ? "border-red-500/25 bg-red-500/15 text-red-300"
              : user?.role === "LUCY_PRO"
                ? "border-violet-500/25 bg-violet-500/15 text-violet-300"
                : "border-emerald-500/25 bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {user ? roleLabel(user) : "Sign in"}
        </span>
      </div>
      <Settings className="size-4 text-muted-foreground" />
    </Link>
  );
}
