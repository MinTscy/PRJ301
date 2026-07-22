"use client";

import {
  AtSign,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Coins,
  FileText,
  GraduationCap,
  History,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Mail,
  Pencil,
  Podcast,
  ReceiptText,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Unlock,
  UserRound,
  UsersRound,
  WalletCards,
  X
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type AuthUser, type PodcastRecording, type SystemAnalytics, type WalletSnapshot, api, walletApi } from "@/lib/api";
import { realtimeApi } from "@/lib/realtime";
import {
  AUTH_SESSION_EVENT,
  AUTH_TOKEN_KEY,
  clearAuthSession,
  readStoredUser,
  updateStoredUser
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

function roleVariant(user: AuthUser): "teal" | "violet" | "coral" {
  if (user.role === "LUCY_SUPER") return "coral";
  if (user.role === "LUCY_PRO") return "violet";
  return "teal";
}

function StatCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">{icon}</div>
          <span className="text-3xl font-black text-white">{value}</span>
        </div>
        <div className="mt-4 font-black text-white">{label}</div>
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function EmptyCollection({ children }: { children: ReactNode }) {
  return <EmptyState>{children}</EmptyState>;
}

export function ProfilePanel() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  // Base draft fields
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftDob, setDraftDob] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  // Learner draft fields
  const [draftTargetLang, setDraftTargetLang] = useState("");
  const [draftNativeLang, setDraftNativeLang] = useState("");
  const [draftDailyGoal, setDraftDailyGoal] = useState("");
  // Mentor draft fields
  const [draftQualifications, setDraftQualifications] = useState("");
  const [draftTeachingLangs, setDraftTeachingLangs] = useState("");
  // Password change draft fields
  const [draftCurrentPw, setDraftCurrentPw] = useState("");
  const [draftNewPw, setDraftNewPw] = useState("");
  const [draftConfirmPw, setDraftConfirmPw] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState("");
  const [provider, setProvider] = useState<"SANDBOX" | "MOCK_MOMO" | "MOCK_VNPAY">("SANDBOX");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpMessage, setTopUpMessage] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  // Email Change Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalStep, setEmailModalStep] = useState<"REQUEST" | "CONFIRM">("REQUEST");
  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailCurrentPwInput, setEmailCurrentPwInput] = useState("");
  const [oldEmailCodeInput, setOldEmailCodeInput] = useState("");
  const [newEmailCodeInput, setNewEmailCodeInput] = useState("");
  const [emailModalLoading, setEmailModalLoading] = useState(false);
  const [emailModalError, setEmailModalError] = useState<string | null>(null);
  const [emailModalSuccess, setEmailModalSuccess] = useState<string | null>(null);

  // Admin User Management states (LUCY_SUPER only)
  const [adminUsers, setAdminUsers] = useState<AuthUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [confirmRoleTarget, setConfirmRoleTarget] = useState<{
    user: AuthUser;
    newRole: "LUCY" | "LUCY_PRO" | "LUCY_SUPER";
  } | null>(null);
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<AuthUser | null>(null);
  const [adminPodcasts, setAdminPodcasts] = useState<PodcastRecording[]>([]);

  const loadWallet = useCallback(async () => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setWalletLoading(false);
      return;
    }

    setWalletLoading(true);
    setWalletError(false);
    try {
      setWallet(await walletApi.wallet(token));
    } catch {
      setWalletError(true);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const loadAdminUsers = useCallback(async () => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      setAdminUsers(await api.listUsers(token));
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    try {
      setAnalytics(await api.getAnalytics(token));
    } catch {}
  }, []);

  const loadAdminPodcasts = useCallback(async () => {
    try {
      setAdminPodcasts(await realtimeApi.podcasts());
    } catch {}
  }, []);

  async function handleUpdateRole(targetUserId: number, newRole: "LUCY" | "LUCY_PRO" | "LUCY_SUPER") {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setAdminMessage(null);
    setAdminError(null);
    try {
      const updated = await api.updateUserRole(token, targetUserId, newRole);
      setAdminUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setAdminMessage(`Phân quyền tài khoản ${updated.email} thành ${roleLabel(updated)} thành công!`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Không thể phân quyền tài khoản.");
    }
  }

  async function handleToggleStatus(targetUserId: number, currentEnabled: boolean) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setAdminMessage(null);
    setAdminError(null);
    try {
      const updated = await api.toggleUserStatus(token, targetUserId, !currentEnabled);
      setAdminUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setAdminMessage(`Đã ${updated.enabled ? "mở khóa" : "khóa"} tài khoản ${updated.email}!`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Không thể thay đổi trạng thái tài khoản.");
    }
  }

  async function handleResetPassword(targetUserId: number) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setAdminMessage(null);
    setAdminError(null);
    try {
      const updated = await api.resetUserPassword(token, targetUserId, "12345678");
      setAdminMessage(`Đã đặt lại mật khẩu tài khoản ${updated.email} về '12345678'!`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Không thể đặt lại mật khẩu.");
    }
  }

  async function handleDeleteUser(targetUserId: number) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setAdminMessage(null);
    setAdminError(null);
    try {
      await api.deleteUser(token, targetUserId);
      setAdminUsers((prev) => prev.filter((u) => u.id !== targetUserId));
      setAdminMessage(`Đã xóa vĩnh viễn tài khoản thành công!`);
      void loadAnalytics();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Không thể xóa tài khoản.");
    }
  }

  async function handleDeletePodcast(podcastId: string) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setAdminMessage(null);
    setAdminError(null);
    try {
      await realtimeApi.deletePodcast(token, podcastId);
      setAdminPodcasts((prev) => prev.filter((p) => p.id !== podcastId));
      setAdminMessage(`Đã gỡ bản ghi âm Podcast thành công!`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Không thể gỡ Podcast.");
    }
  }

  useEffect(() => {
    const stored = readStoredUser();
    setUser(stored);
    void loadWallet();
    if (stored?.role === "LUCY_SUPER") {
      void loadAdminUsers();
      void loadAnalytics();
      void loadAdminPodcasts();
    }

    const handleSession = (event: Event) => {
      const updatedUser = (event as CustomEvent<AuthUser | null>).detail ?? readStoredUser();
      setUser(updatedUser);
      if (updatedUser?.role === "LUCY_SUPER") {
        void loadAdminUsers();
        void loadAnalytics();
        void loadAdminPodcasts();
      }
    };
    window.addEventListener(AUTH_SESSION_EVENT, handleSession);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, handleSession);
  }, [loadWallet, loadAdminUsers, loadAnalytics, loadAdminPodcasts]);

  async function logout() {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    setLoggingOut(true);
    if (token) await api.logout(token).catch(() => undefined);
    clearAuthSession();
    router.replace("/auth");
  }

  function startEditingProfile() {
    if (!user) return;
    setDraftDisplayName(user.displayName);
    setDraftEmail(user.email);
    setDraftDob(user.dob ?? "");
    setDraftPhone(user.phoneNumber ?? "");
    setDraftTargetLang(user.targetLanguage ?? "");
    setDraftNativeLang(user.nativeLanguage ?? "");
    setDraftDailyGoal(user.dailyGoal ?? "");
    setDraftQualifications(user.qualifications ?? "");
    setDraftTeachingLangs(user.teachingLanguages ?? "");
    setDraftCurrentPw("");
    setDraftNewPw("");
    setDraftConfirmPw("");
    setProfileMessage(null);
    setProfileError(null);
    setEditingProfile(true);
  }

  async function saveProfile() {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const displayName = draftDisplayName.trim();
    const email = draftEmail.trim();
    setProfileMessage(null);
    setProfileError(null);

    if (!token) {
      setProfileError("Your session has expired. Please sign in again.");
      return;
    }
    if (!displayName || !email) {
      setProfileError("Display name and email are required.");
      return;
    }
    if (draftNewPw && draftNewPw !== draftConfirmPw) {
      setProfileError("New password and confirm password do not match.");
      return;
    }
    if (draftNewPw && draftNewPw.length < 8) {
      setProfileError("New password must be at least 8 characters.");
      return;
    }

    setProfileSaving(true);
    try {
      const updatedUser = await api.updateProfile(token, {
        displayName,
        email,
        dob: draftDob || null,
        phoneNumber: draftPhone || null,
        targetLanguage: draftTargetLang || null,
        nativeLanguage: draftNativeLang || null,
        dailyGoal: draftDailyGoal || null,
        qualifications: draftQualifications || null,
        teachingLanguages: draftTeachingLangs || null,
        currentPassword: draftCurrentPw || null,
        newPassword: draftNewPw || null,
      });
      setUser(updatedUser);
      updateStoredUser(updatedUser);
      setEditingProfile(false);
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to update your profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function openEmailChangeModal() {
    setNewEmailInput("");
    setEmailCurrentPwInput("");
    setOldEmailCodeInput("");
    setNewEmailCodeInput("");
    setEmailModalError(null);
    setEmailModalSuccess(null);
    setEmailModalStep("REQUEST");
    setShowEmailModal(true);
  }

  async function handleRequestEmailChange() {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const targetEmail = newEmailInput.trim();
    setEmailModalError(null);
    setEmailModalSuccess(null);

    if (!token) {
      setEmailModalError("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }
    if (!targetEmail) {
      setEmailModalError("Vui lòng nhập địa chỉ email mới.");
      return;
    }
    if (user && targetEmail.toLowerCase() === user.email.toLowerCase()) {
      setEmailModalError("Email mới không được trùng với email hiện tại.");
      return;
    }

    setEmailModalLoading(true);
    try {
      const res = await api.requestEmailChange(token, {
        newEmail: targetEmail,
        currentPassword: emailCurrentPwInput || undefined
      });
      setEmailModalSuccess(res.message || "Mã xác nhận đã được gửi tới cả Email hiện tại và Email mới.");
      setEmailModalStep("CONFIRM");
    } catch (err) {
      setEmailModalError(err instanceof Error ? err.message : "Không thể gửi yêu cầu đổi email.");
    } finally {
      setEmailModalLoading(false);
    }
  }

  async function handleConfirmEmailChange() {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const targetEmail = newEmailInput.trim();
    const oldCode = oldEmailCodeInput.trim();
    const newCode = newEmailCodeInput.trim();
    setEmailModalError(null);
    setEmailModalSuccess(null);

    if (!token) {
      setEmailModalError("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }
    if (!oldCode || oldCode.length !== 6 || !newCode || newCode.length !== 6) {
      setEmailModalError("Vui lòng nhập đầy đủ mã xác nhận 6 chữ số từ cả Email cũ và Email mới.");
      return;
    }

    setEmailModalLoading(true);
    try {
      const updatedUser = await api.confirmEmailChange(token, {
        newEmail: targetEmail,
        oldEmailCode: oldCode,
        newEmailCode: newCode
      });
      setUser(updatedUser);
      updateStoredUser(updatedUser);
      setDraftEmail(updatedUser.email);
      setProfileMessage("Cập nhật Email thành công!");
      setShowEmailModal(false);
    } catch (err) {
      setEmailModalError(err instanceof Error ? err.message : "Mã xác nhận không hợp lệ hoặc đã hết hạn.");
    } finally {
      setEmailModalLoading(false);
    }
  }

  async function submitTopUp() {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const amount = customAmount ? Number(customAmount) : topUpAmount;
    setTopUpMessage(null);
    setTopUpError(null);

    if (!token) {
      setTopUpError("Your session has expired. Please sign in again.");
      return;
    }
    if (!Number.isInteger(amount) || amount < 10 || amount > 1_000_000) {
      setTopUpError("Enter an amount from 10 to 1,000,000 Lucy Points.");
      return;
    }

    setTopUpLoading(true);
    try {
      const updatedWallet = await walletApi.topUp(token, {
        amount,
        provider,
        idempotencyKey: crypto.randomUUID().replaceAll("-", "")
      });
      setWallet(updatedWallet);
      setCustomAmount("");
      setTopUpMessage(`${amount.toLocaleString("en-US")} Lucy Points added successfully.`);
    } catch (error) {
      setTopUpError(error instanceof Error ? error.message : "Unable to top up your wallet.");
    } finally {
      setTopUpLoading(false);
    }
  }

  if (!user) {
    return (
      <EmptyState>
        Profile information is unavailable. Sign in again to restore your session.
      </EmptyState>
    );
  }

  const isCreator = user.role === "LUCY_PRO" || user.role === "LUCY_SUPER";
  const balance = walletLoading ? "…" : wallet ? wallet.balance.toLocaleString("en-US") : "—";

  return (
    <div>
      <PageHeader
        eyebrow="Your profile"
        title={`Welcome back, ${user.displayName}.`}
        description="Manage your account identity and review your learning community activity in one place."
        actions={
          <Button variant="outline" onClick={logout} disabled={loggingOut}>
            <LogOut className="size-4" />
            {loggingOut ? "Signing out..." : "Sign out"}
          </Button>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid size-24 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-primary to-secondary text-3xl font-black text-white shadow-glow">
                {initials(user.displayName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-3xl font-black text-white">{user.displayName}</h2>
                  <Badge variant={roleVariant(user)}>{roleLabel(user)}</Badge>
                  {!editingProfile ? (
                    <Button size="sm" variant="outline" onClick={startEditingProfile}>
                      <Pencil className="size-4" /> Edit profile
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <AtSign className="size-4 text-primary shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <Button size="sm" variant="outline" type="button" className="h-7 border-primary/40 text-primary hover:bg-primary/10 text-xs px-2.5 shrink-0" onClick={openEmailChangeModal}>
                      <Mail className="size-3.5 mr-1" /> Đổi Email
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <UserRound className="size-4 text-primary shrink-0" />
                    <span className="truncate font-mono text-xs">{user.personaId}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── View-mode extra info ──────────────────────────────────── */}
            {!editingProfile && (user.dob || user.phoneNumber || user.targetLanguage || user.nativeLanguage || user.dailyGoal || user.qualifications || user.teachingLanguages) && (
              <div className="mt-5 grid gap-3 border-t border-white/10 pt-5">
                {/* Common fields */}
                {(user.dob || user.phoneNumber) && (
                  <div className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
                    {user.dob && (
                      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <span className="text-primary">📅</span>
                        <span>{new Date(user.dob).toLocaleDateString("vi-VN")}</span>
                      </div>
                    )}
                    {user.phoneNumber && (
                      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <span className="text-primary">📞</span>
                        <span>{user.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Learner fields */}
                {user.role === "LUCY" && (user.targetLanguage || user.nativeLanguage || user.dailyGoal) && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                    <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Learning Preferences</p>
                    <div className="grid gap-1 text-muted-foreground sm:grid-cols-3">
                      {user.targetLanguage && (
                        <div><span className="text-white font-bold">Target: </span>{user.targetLanguage}</div>
                      )}
                      {user.nativeLanguage && (
                        <div><span className="text-white font-bold">Native: </span>{user.nativeLanguage}</div>
                      )}
                      {user.dailyGoal && (
                        <div><span className="text-white font-bold">Daily Goal: </span>{user.dailyGoal}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mentor / Creator fields */}
                {isCreator && (user.teachingLanguages || user.qualifications) && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                    <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Teaching Info</p>
                    <div className="grid gap-1 text-muted-foreground">
                      {user.teachingLanguages && (
                        <div><span className="text-white font-bold">Languages: </span>{user.teachingLanguages}</div>
                      )}
                      {user.qualifications && (
                        <div className="mt-1 whitespace-pre-line"><span className="text-white font-bold">Qualifications: </span>{user.qualifications}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {editingProfile ? (
              <form
                className="mt-6 grid gap-4 border-t border-white/10 pt-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveProfile();
                }}
              >
                {/* Base fields */}
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Basic Info</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-white sm:col-span-2">
                    Display name
                    <Input autoFocus maxLength={120} value={draftDisplayName} onChange={(e) => setDraftDisplayName(e.target.value)} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-white">
                    Date of birth
                    <Input type="date" value={draftDob} onChange={(e) => setDraftDob(e.target.value)} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-white">
                    Phone number
                    <Input type="tel" maxLength={20} placeholder="+84 xxx xxx xxx" value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} />
                  </label>
                </div>

                {/* Learner-specific fields */}
                {user.role === "LUCY" && (
                  <>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Learning Preferences</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-bold text-white">
                        Target Language
                        <Input maxLength={60} placeholder="e.g. English, Japanese" value={draftTargetLang} onChange={(e) => setDraftTargetLang(e.target.value)} />
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-white">
                        Native Language
                        <Input maxLength={60} placeholder="e.g. Vietnamese" value={draftNativeLang} onChange={(e) => setDraftNativeLang(e.target.value)} />
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-white sm:col-span-2">
                        Daily Learning Goal
                        <Input maxLength={60} placeholder="e.g. 30 minutes/day" value={draftDailyGoal} onChange={(e) => setDraftDailyGoal(e.target.value)} />
                      </label>
                    </div>
                  </>
                )}

                {/* Mentor / Creator specific fields */}
                {isCreator && (
                  <>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Teaching Info</p>
                    <div className="grid gap-4">
                      <label className="grid gap-2 text-sm font-bold text-white">
                        Teaching Languages
                        <Input maxLength={255} placeholder="e.g. English, French, Spanish" value={draftTeachingLangs} onChange={(e) => setDraftTeachingLangs(e.target.value)} />
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-white">
                        Qualifications &amp; Certifications
                        <textarea
                          className="min-h-24 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="e.g. TEFL Certified, MA in Linguistics..."
                          maxLength={1000}
                          value={draftQualifications}
                          onChange={(e) => setDraftQualifications(e.target.value)}
                        />
                      </label>
                    </div>
                  </>
                )}

                {/* Password change — all roles */}
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Change Password</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-white sm:col-span-2">
                    Current password
                    <Input type="password" placeholder="Leave blank to keep current password" value={draftCurrentPw} onChange={(e) => setDraftCurrentPw(e.target.value)} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-white">
                    New password
                    <Input type="password" placeholder="Min 8 characters" value={draftNewPw} onChange={(e) => setDraftNewPw(e.target.value)} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-white">
                    Confirm new password
                    <Input type="password" placeholder="Repeat new password" value={draftConfirmPw} onChange={(e) => setDraftConfirmPw(e.target.value)} />
                  </label>
                </div>

                {profileError ? (
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
                    {profileError}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={profileSaving}>
                    <Save className="size-4" /> {profileSaving ? "Saving..." : "Save changes"}
                  </Button>
                  <Button type="button" variant="ghost" disabled={profileSaving} onClick={() => { setEditingProfile(false); setProfileError(null); }}>
                    <X className="size-4" /> Cancel
                  </Button>
                </div>
              </form>
            ) : null}
            {profileMessage ? (
              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">
                <CheckCircle2 className="size-4" /> {profileMessage}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-primary/25 bg-primary/10">
          <CardContent className="flex h-full flex-col justify-between p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Account balance</p>
                <div className="mt-3 text-4xl font-black text-white">{balance}</div>
                <p className="mt-1 text-sm text-muted-foreground">Lucy Points</p>
              </div>
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/20 text-primary">
                <WalletCards className="size-6" />
              </div>
            </div>
            {walletError ? (
              <button type="button" className="mt-5 flex items-center gap-2 text-sm font-bold text-amber-300" onClick={loadWallet}>
                <RefreshCw className="size-4" /> Wallet unavailable — retry
              </button>
            ) : (
              <p className="mt-5 text-xs text-muted-foreground">Synced securely from the wallet service.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-5 text-primary" /> Top up Lucy Points
            </CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Choose a package or enter a custom amount. Payment providers are running in demo mode.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[100, 250, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setTopUpAmount(amount);
                    setCustomAmount("");
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    !customAmount && topUpAmount === amount
                      ? "border-primary/50 bg-primary/15 ring-4 ring-primary/10"
                      : "border-white/10 bg-white/[0.03] hover:border-primary/30"
                  }`}
                >
                  <div className="text-xl font-black text-white">{amount.toLocaleString("en-US")}</div>
                  <div className="mt-1 text-xs font-bold text-muted-foreground">Lucy Points</div>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-white">
                Custom amount
                <Input
                  type="number"
                  min={10}
                  max={1_000_000}
                  step={1}
                  placeholder="10 - 1,000,000"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-white">
                Payment method
                <select
                  className="h-10 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as typeof provider)}
                >
                  <option className="bg-lucy-ink" value="SANDBOX">Sandbox wallet</option>
                  <option className="bg-lucy-ink" value="MOCK_MOMO">MoMo — demo</option>
                  <option className="bg-lucy-ink" value="MOCK_VNPAY">VNPay — demo</option>
                </select>
              </label>
            </div>

            {topUpMessage ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">
                <CheckCircle2 className="size-4" /> {topUpMessage}
              </div>
            ) : null}
            {topUpError ? (
              <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
                {topUpError}
              </div>
            ) : null}

            <Button className="mt-5 w-full" onClick={submitTopUp} disabled={topUpLoading || walletLoading}>
              <Coins className="size-4" />
              {topUpLoading
                ? "Processing..."
                : `Add ${(customAmount ? Number(customAmount) || 0 : topUpAmount).toLocaleString("en-US")} Lucy Points`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="size-5 text-secondary" /> Lucy Points history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wallet?.recentTransactions.length ? (
              <div className="grid gap-3">
                {wallet.recentTransactions.slice(0, 8).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="min-w-0">
                      <div className="font-bold text-white">
                        {transaction.type === "TOP_UP" ? "Wallet top-up" : transaction.type === "GIFT_SENT" ? "Gift sent" : transaction.type}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleString()} · {transaction.reference.replaceAll("_", " ")}
                      </div>
                    </div>
                    <div className={`shrink-0 text-sm font-black ${transaction.amount >= 0 ? "text-emerald-300" : "text-lucy-coral"}`}>
                      {transaction.amount >= 0 ? "+" : ""}{transaction.amount.toLocaleString("en-US")} LP
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyCollection>Your Lucy Points transactions will appear here.</EmptyCollection>
            )}
          </CardContent>
        </Card>
      </section>

      <section className={`mt-5 grid gap-5 ${isCreator ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <StatCard icon={<UsersRound className="size-5" />} label="Following" value="0" helper="Accounts you follow" />
        <StatCard icon={<History className="size-5" />} label="Lessons completed" value="0" helper="Your learning history" />
        {isCreator ? (
          <StatCard icon={<UserRound className="size-5" />} label="Followers" value="0" helper="Accounts following you" />
        ) : null}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="size-5 text-primary" /> Following
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyCollection>You are not following any accounts yet.</EmptyCollection>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpenCheck className="size-5 text-lucy-teal" /> Learning history
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyCollection>Completed lessons will appear here when learning-history tracking is available.</EmptyCollection>
          </CardContent>
        </Card>
      </section>

      {isCreator ? (
        <>
          <section className="mt-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="size-5 text-secondary" /> Followers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyCollection>No accounts are following this profile yet.</EmptyCollection>
              </CardContent>
            </Card>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="size-5 text-lucy-teal" /> Courses</CardTitle></CardHeader>
              <CardContent><EmptyCollection>No courses published yet.</EmptyCollection></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Podcast className="size-5 text-primary" /> Podcasts</CardTitle></CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href="/podcasts">
                    Open podcast library
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-5 text-lucy-coral" /> Posts</CardTitle></CardHeader>
              <CardContent><EmptyCollection>No posts published yet.</EmptyCollection></CardContent>
            </Card>
          </section>
        </>
      ) : null}

      {/* ── Admin User & System Management Panel (LUCY_SUPER only) ────────────────── */}
      {user.role === "LUCY_SUPER" && (
        <div className="mt-8 space-y-6">
          {/* Analytics Cards */}
          {analytics && (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-red-500/20 bg-slate-900/50">
                <CardContent className="pt-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">Total Users</p>
                    <p className="text-3xl font-black text-white mt-1">{analytics.totalUsers}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.totalLearners} Learners • {analytics.totalMentors} Mentors
                    </p>
                  </div>
                  <div className="grid size-12 place-items-center rounded-2xl bg-red-500/15 text-red-400">
                    <UsersRound className="size-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-violet-500/20 bg-slate-900/50">
                <CardContent className="pt-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">Mentors (Pro)</p>
                    <p className="text-3xl font-black text-violet-300 mt-1">{analytics.totalMentors}</p>
                    <p className="text-xs text-muted-foreground mt-1">Live moderators</p>
                  </div>
                  <div className="grid size-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-400">
                    <GraduationCap className="size-6" />
                  </div>
                </CardContent>
              </Card>



              <Card className="border-cyan-500/20 bg-slate-900/50">
                <CardContent className="pt-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">LMS Levels</p>
                    <p className="text-3xl font-black text-cyan-300 mt-1">{analytics.totalLevels}</p>
                    <p className="text-xs text-muted-foreground mt-1">{analytics.totalLanguages} Languages • {analytics.totalStages} Stages</p>
                  </div>
                  <div className="grid size-12 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-400">
                    <Layers className="size-6" />
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* User Management Panel */}
          <Card className="border-red-500/30 bg-slate-900/60">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl font-black text-white">
                <ShieldCheck className="size-6 text-red-400" />
                System User Management (Admin Dashboard)
              </CardTitle>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void loadAdminUsers();
                  void loadAnalytics();
                  void loadAdminPodcasts();
                }}
                disabled={adminLoading}
                className="h-8 border-white/20 text-xs"
              >
                <RefreshCw className={`size-3.5 mr-1.5 ${adminLoading ? "animate-spin" : ""}`} />
                Reload Data
              </Button>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {adminMessage && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm font-bold text-emerald-300">
                  {adminMessage}
                </div>
              )}
              {adminError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm font-bold text-red-300">
                  {adminError}
                </div>
              )}

              {adminUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading registered users...</p>
              ) : (
                <div className="grid gap-3">
                  {adminUsers.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-black text-white text-base">{item.displayName}</span>
                          <Badge variant={roleVariant(item)}>{roleLabel(item)}</Badge>
                          {item.enabled === false ? (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Locked</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Active</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
                          <span>{item.email}</span>
                          <span>•</span>
                          <span>{item.personaId}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Role controls */}
                        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
                          <Button
                            size="sm"
                            variant={item.role === "LUCY" ? "default" : "ghost"}
                            className="h-7 text-xs px-2"
                            onClick={() => setConfirmRoleTarget({ user: item, newRole: "LUCY" })}
                            disabled={item.role === "LUCY"}
                          >
                            Learner
                          </Button>
                          <Button
                            size="sm"
                            variant={item.role === "LUCY_PRO" ? "default" : "ghost"}
                            className="h-7 text-xs px-2"
                            onClick={() => setConfirmRoleTarget({ user: item, newRole: "LUCY_PRO" })}
                            disabled={item.role === "LUCY_PRO"}
                          >
                            Pro
                          </Button>
                          <Button
                            size="sm"
                            variant={item.role === "LUCY_SUPER" ? "default" : "ghost"}
                            className="h-7 text-xs px-2"
                            onClick={() => setConfirmRoleTarget({ user: item, newRole: "LUCY_SUPER" })}
                            disabled={item.role === "LUCY_SUPER"}
                          >
                            Super
                          </Button>
                        </div>

                        {/* Account Actions */}
                        {item.id !== user.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className={`h-7 text-xs px-2.5 ${item.enabled === false ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}
                              onClick={() => void handleToggleStatus(item.id, item.enabled !== false)}
                              title={item.enabled === false ? "Unlock account" : "Lock account"}
                            >
                              {item.enabled === false ? <Unlock className="size-3.5 mr-1" /> : <Lock className="size-3.5 mr-1" />}
                              {item.enabled === false ? "Mở khóa" : "Khóa"}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5 border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                              onClick={() => void handleResetPassword(item.id)}
                              title="Reset password to 12345678"
                            >
                              <KeyRound className="size-3.5 mr-1" />
                              Reset Pass
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs px-2.5 bg-red-600/80 hover:bg-red-600 text-white"
                              onClick={() => setDeleteUserTarget(item)}
                              title="Delete account"
                            >
                              <Trash2 className="size-3.5 mr-1" />
                              Xóa
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs italic text-muted-foreground px-2">Current Admin</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Podcast Moderation Panel */}
          {adminPodcasts.length > 0 && (
            <Card className="border-primary/30 bg-slate-900/60">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-black text-white">
                  <Podcast className="size-6 text-primary" />
                  Podcast Media Moderation ({adminPodcasts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {adminPodcasts.map((podcast) => (
                    <div key={podcast.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">{podcast.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{podcast.roomCode}</Badge>
                          <span>{podcast.creatorDisplayName}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs px-2 bg-red-600/70 hover:bg-red-600 shrink-0"
                        onClick={() => void handleDeletePodcast(podcast.id)}
                      >
                        <Trash2 className="size-3.5 mr-1" /> Gỡ
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Role Change Confirmation Modal ───────────────────────────── */}
      {confirmRoleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-slate-900/95 p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-red-500/20 text-red-400">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Xác nhận phân quyền</h3>
                  <p className="text-xs text-muted-foreground">Cần sự xác nhận của Quản trị viên</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmRoleTarget(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Bạn có chắc chắn muốn thay đổi vai trò tài khoản của:
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 space-y-2">
                <div className="font-bold text-white text-base">{confirmRoleTarget.user.displayName}</div>
                <div className="text-xs text-muted-foreground font-mono">{confirmRoleTarget.user.email}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-white/10">
                  <span className="text-muted-foreground">Hiện tại:</span>
                  <Badge variant={roleVariant(confirmRoleTarget.user)}>{roleLabel(confirmRoleTarget.user)}</Badge>
                  <span className="text-muted-foreground">➔</span>
                  <span className="text-muted-foreground">Mới:</span>
                  <Badge variant={roleVariant({ ...confirmRoleTarget.user, role: confirmRoleTarget.newRole })}>
                    {confirmRoleTarget.newRole === "LUCY_SUPER" ? "Super" : confirmRoleTarget.newRole === "LUCY_PRO" ? "Pro" : "Learner"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <Button variant="outline" size="sm" onClick={() => setConfirmRoleTarget(null)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={async () => {
                  const target = confirmRoleTarget;
                  setConfirmRoleTarget(null);
                  await handleUpdateRole(target.user.id, target.newRole);
                }}
              >
                Xác nhận đổi Role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete User Confirmation Modal ───────────────────────────── */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-red-600/50 bg-slate-950 p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-red-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-red-600/30 text-red-400">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-300">CẢNH BÁO: Xóa Tài Khoản</h3>
                  <p className="text-xs text-muted-foreground">Hành động này KHÔNG THỂ khôi phục</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteUserTarget(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Bạn có chắc chắn muốn <strong className="text-red-400">XÓA VĨNH VIỄN</strong> tài khoản dưới đây khỏi hệ thống không?
              </p>
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 space-y-1.5">
                <div className="font-bold text-white text-base">{deleteUserTarget.displayName}</div>
                <div className="text-xs text-muted-foreground font-mono">{deleteUserTarget.email}</div>
                <div className="text-xs text-muted-foreground font-mono">{deleteUserTarget.personaId}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <Button variant="outline" size="sm" onClick={() => setDeleteUserTarget(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 font-bold text-white"
                onClick={async () => {
                  const target = deleteUserTarget;
                  setDeleteUserTarget(null);
                  await handleDeleteUser(target.id);
                }}
              >
                Xác nhận XÓA vĩnh viễn
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email Change Modal ────────────────────────────────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-primary/20 text-primary">
                  {emailModalStep === "REQUEST" ? <Mail className="size-5" /> : <ShieldCheck className="size-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-black">
                    {emailModalStep === "REQUEST" ? "Yêu cầu thay đổi Email" : "Xác thực thay đổi Email"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {emailModalStep === "REQUEST"
                      ? "Cần gửi mã xác thực đến cả Email cũ và Email mới."
                      : `Mã xác nhận 6 chữ số đã được gửi tới ${user.email} và ${newEmailInput}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            {emailModalError && (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
                {emailModalError}
              </div>
            )}

            {emailModalSuccess && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{emailModalSuccess}</span>
              </div>
            )}

            {emailModalStep === "REQUEST" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleRequestEmailChange();
                }}
                className="space-y-4"
              >
                <label className="grid gap-2 text-sm font-bold">
                  Email mới
                  <Input
                    type="email"
                    required
                    placeholder="nhap-email-moi@domain.com"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Mật khẩu hiện tại (Tùy chọn)
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu hiện tại"
                    value={emailCurrentPwInput}
                    onChange={(e) => setEmailCurrentPwInput(e.target.value)}
                  />
                </label>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={emailModalLoading} className="flex-1">
                    {emailModalLoading ? "Đang gửi..." : "Gửi mã xác nhận"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={emailModalLoading}
                    onClick={() => setShowEmailModal(false)}
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleConfirmEmailChange();
                }}
                className="space-y-4"
              >
                <label className="grid gap-2 text-sm font-bold">
                  <span>Mã xác nhận từ Email hiện tại (<span className="text-primary font-mono">{user.email}</span>)</span>
                  <Input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="123456"
                    value={oldEmailCodeInput}
                    onChange={(e) => setOldEmailCodeInput(e.target.value.replace(/\D/g, ""))}
                    className="text-center font-mono text-xl tracking-[0.4em] h-12"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  <span>Mã xác nhận từ Email mới (<span className="text-lucy-teal font-mono">{newEmailInput}</span>)</span>
                  <Input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="654321"
                    value={newEmailCodeInput}
                    onChange={(e) => setNewEmailCodeInput(e.target.value.replace(/\D/g, ""))}
                    className="text-center font-mono text-xl tracking-[0.4em] h-12"
                  />
                </label>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={emailModalLoading}
                    onClick={() => setEmailModalStep("REQUEST")}
                  >
                    Quay lại
                  </Button>
                  <Button
                    type="submit"
                    disabled={emailModalLoading || oldEmailCodeInput.length !== 6 || newEmailCodeInput.length !== 6}
                    className="flex-1"
                  >
                    {emailModalLoading ? "Đang xác thực..." : "Xác nhận đổi Email"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
