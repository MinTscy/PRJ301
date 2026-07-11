"use client";

import {
  AtSign,
  BookOpenCheck,
  CheckCircle2,
  Coins,
  FileText,
  GraduationCap,
  History,
  LogOut,
  Pencil,
  Podcast,
  ReceiptText,
  RefreshCw,
  Save,
  UserRound,
  UsersRound,
  WalletCards,
  X
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type AuthUser, type WalletSnapshot, api, walletApi } from "@/lib/api";
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
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState("");
  const [provider, setProvider] = useState<"SANDBOX" | "MOCK_MOMO" | "MOCK_VNPAY">("SANDBOX");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpMessage, setTopUpMessage] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);

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

  useEffect(() => {
    setUser(readStoredUser());
    void loadWallet();

    const handleSession = (event: Event) => {
      setUser((event as CustomEvent<AuthUser | null>).detail ?? readStoredUser());
    };
    window.addEventListener(AUTH_SESSION_EVENT, handleSession);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, handleSession);
  }, [loadWallet]);

  async function logout() {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    setLoggingOut(true);
    if (token) await api.logout(token).catch(() => undefined);
    clearAuthSession();
    router.replace("/auth");
    router.refresh();
  }

  function startEditingProfile() {
    if (!user) return;
    setDraftDisplayName(user.displayName);
    setDraftEmail(user.email);
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

    setProfileSaving(true);
    try {
      const updatedUser = await api.updateProfile(token, { displayName, email });
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
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <AtSign className="size-4 text-primary" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <UserRound className="size-4 text-primary" />
                    <span className="truncate font-mono text-xs">{user.personaId}</span>
                  </div>
                </div>
              </div>
            </div>

            {editingProfile ? (
              <form
                className="mt-6 grid gap-4 border-t border-white/10 pt-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveProfile();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-white">
                    Display name
                    <Input
                      autoFocus
                      maxLength={120}
                      value={draftDisplayName}
                      onChange={(event) => setDraftDisplayName(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-white">
                    Email
                    <Input
                      type="email"
                      maxLength={180}
                      value={draftEmail}
                      onChange={(event) => setDraftEmail(event.target.value)}
                    />
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
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={profileSaving}
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileError(null);
                    }}
                  >
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
              <CardContent><EmptyCollection>No podcasts published yet.</EmptyCollection></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-5 text-lucy-coral" /> Posts</CardTitle></CardHeader>
              <CardContent><EmptyCollection>No posts published yet.</EmptyCollection></CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}
