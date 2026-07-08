import type { AuthUser } from "./api";

export const AUTH_TOKEN_KEY = "lucy.accessToken";
export const AUTH_USER_KEY = "lucy.user";
export const AUTH_SESSION_EVENT = "lucy:auth-session-changed";

export function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(AUTH_USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function notifyAuthSessionChanged(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AuthUser | null>(AUTH_SESSION_EVENT, { detail: user })
  );
}

export function persistAuthSession(accessToken: string, user: AuthUser) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  notifyAuthSessionChanged(user);
}

export function updateStoredUser(user: AuthUser) {
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  notifyAuthSessionChanged(user);
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  notifyAuthSessionChanged(null);
}
