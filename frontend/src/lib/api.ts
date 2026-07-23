export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

export const WALLET_BASE_URL =
  process.env.NEXT_PUBLIC_WALLET_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:5002";

export type Language = {
  id: number;
  code: string;
  name: string;
};

export type Level = {
  id: number;
  levelNumber: number;
  title: string;
  durationMinutes: number;
  stageNumber: number;
  stageName: string;
  languageCode: string;
};

export type Content = {
  id: number;
  contentText: string;
  contentType: string;
};

export type AIQuestion = {
  id: number;
  questionText: string;
};

export type SubLevel = {
  id: number;
  subOrder: number;
  title: string;
  durationMinutes: number;
  contents: Content[];
  aiQuestions: AIQuestion[];
};

export type LevelDetail = {
  id: number;
  levelNumber: number;
  title: string;
  durationMinutes: number;
  stage: {
    id: number;
    stageNumber: number;
    name: string;
    description: string;
    languageCode: string;
    languageName: string;
  };
  subLevels: SubLevel[];
};

export type StageCoverage = {
  stageNumber: number;
  expectedStartLevel: number;
  expectedEndLevel: number;
  expectedLevels: number;
  importedLevels: number;
  missingLevels: number;
  stageExists: boolean;
  complete: boolean;
  missingLevelNumbers: number[];
};

export type LanguageCoverage = {
  languageCode: string;
  languageName: string;
  totalExpectedLevels: number;
  importedLevels: number;
  missingLevels: number;
  complete: boolean;
  stages: StageCoverage[];
};

export type LiveRoom = {
  id: number;
  roomCode: string;
  displayName: string;
  status: string;
  anonymousMode: boolean;
  startedAt: string;
  levelId: number;
  levelNumber: number;
  levelTitle: string;
  stageNumber: number;
  languageCode: string;
};

export type TimelineStep = {
  subLevelId: number;
  subOrder: number;
  title: string;
  durationMinutes: number;
  startMinute: number;
  endMinute: number;
  current: boolean;
};

export type RoomTimeline = {
  roomId: number;
  roomCode: string;
  levelNumber: number;
  levelTitle: string;
  startedAt: string;
  elapsedMinutes: number;
  completed: boolean;
  currentStep: TimelineStep | null;
  nextStep: TimelineStep | null;
  steps: TimelineStep[];
};

export type PinnedMaterial = {
  id: number;
  title: string;
  materialType: string;
  resourceUrl: string;
  description?: string | null;
  pinnedOrder: number;
  pinnedAt: string;
};

export type AccountRole = "LUCY" | "LUCY_PRO" | "LUCY_SUPER";

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  phoneNumber?: string | null;
  learningLanguages?: string | null;
  teachingLanguages?: string | null;
  certificates?: string | null;
  achievements?: string | null;
  brandName?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  bio?: string | null;
  learnerEnglishLevel?: number | null;
  learnerJapaneseLevel?: number | null;
  learnerChineseLevel?: number | null;
  role: AccountRole;
  personaId: string;
  anonymous: boolean;
};

export type AuthResponse = {
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
};

export type WalletTransaction = {
  id: string;
  type: string;
  amount: number;
  reference: string;
  createdAt: string;
};

export type WalletSnapshot = {
  userId: number;
  balance: number;
  recentTransactions: WalletTransaction[];
};

export type GiftCatalogItem = {
  code: string;
  name: string;
  emoji: string;
  price: number;
};

export type GiftEvent = {
  id: string;
  roomCode: string;
  senderUserId: number;
  senderPersonaId: string;
  senderDisplayName: string;
  recipientPersonaId: string;
  giftCode: string;
  giftName: string;
  emoji: string;
  value: number;
  createdAt: string;
};

export type GiftSendResponse = {
  event: GiftEvent;
  balance: number;
  recipientBalance: number;
  realtimeDelivered: boolean;
};

export type PodcastRecording = {
  id: string;
  roomCode: string;
  title: string;
  creatorPersonaId: string;
  creatorDisplayName: string;
  status: "RECORDING" | "READY";
  audioUrl: string | null;
  contentType: string | null;
  durationSeconds: number | null;
  createdAt: string;
  completedAt: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? text;
    } catch {
      // Keep non-JSON error responses as-is.
    }
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function walletRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${WALLET_BASE_URL}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Wallet request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  languages: () => request<Language[]>("/api/languages"),
  levelsByStage: (languageCode: string, stageNumber: number) =>
    request<Level[]>(`/api/languages/${languageCode}/stages/${stageNumber}/levels`),
  levelDetail: (id: number) => request<LevelDetail>(`/api/levels/${id}/detail`),
  coverage: () => request<LanguageCoverage[]>("/api/levels/coverage"),
  createRoom: (payload: { languageCode: string; levelNumber: number; displayName?: string }) =>
    request<LiveRoom>("/api/rooms", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  createSurvivalRoom: (payload: { languageCode: string; levelNumber: number; displayName?: string }) =>
    request<LiveRoom>("/api/rooms/survival-speaking", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  activeRooms: () => request<LiveRoom[]>("/api/rooms/active"),
  roomById: (id: number) => request<LiveRoom>(`/api/rooms/id/${id}`),
  roomByCode: (roomCode: string) => request<LiveRoom>(`/api/rooms/${encodeURIComponent(roomCode)}`),
  roomTimeline: (roomCode: string) => request<RoomTimeline>(`/api/rooms/${roomCode}/timeline`),
  materials: (roomCode: string) => request<PinnedMaterial[]>(`/api/rooms/${roomCode}/materials`),
  pinMaterial: (
    roomCode: string,
    payload: { title: string; materialType: string; resourceUrl: string; description?: string; pinnedOrder?: number }
  ) =>
    request<PinnedMaterial>(`/api/rooms/${roomCode}/materials`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  unpinMaterial: (roomCode: string, materialId: number) =>
    request<void>(`/api/rooms/${roomCode}/materials/${materialId}`, {
      method: "DELETE"
    }),
  register: (payload: {
    email: string;
    password: string;
    displayName: string;
    role: AccountRole;
    learnerEnglishLevel?: number;
    learnerJapaneseLevel?: number;
    learnerChineseLevel?: number;
  }) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  me: (token: string) =>
    request<AuthUser>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),
  updateProfile: (token: string, payload: Partial<Pick<
    AuthUser,
    | "email"
    | "displayName"
    | "phoneNumber"
    | "learningLanguages"
    | "teachingLanguages"
    | "certificates"
    | "achievements"
    | "brandName"
    | "facebookUrl"
    | "youtubeUrl"
    | "bio"
  >> & { email: string; displayName: string }) =>
    request<AuthUser>("/api/auth/me", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }),
  logout: (token: string) =>
    request<void>("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
};

export const walletApi = {
  wallet: (token: string) => walletRequest<WalletSnapshot>("/api/wallet", token),
  giftCatalog: (token: string) => walletRequest<GiftCatalogItem[]>("/api/gifts/catalog", token),
  sendGift: (
    token: string,
    payload: { roomCode: string; giftCode: string; recipientPersonaId: string }
  ) =>
    walletRequest<GiftSendResponse>("/api/gifts/send", token, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  topUp: (
    token: string,
    payload: { amount: number; provider: "SANDBOX" | "MOCK_MOMO" | "MOCK_VNPAY"; idempotencyKey: string }
  ) =>
    walletRequest<WalletSnapshot>("/api/topups", token, {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
