export type AccountRole = "LUCY" | "LUCY_PRO" | "LUCY_SUPER";
export type ParticipantRole = "audience" | "speaker" | "moderator";

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  learnerEnglishLevel: number | null;
  learnerJapaneseLevel: number | null;
  learnerChineseLevel: number | null;
  role: AccountRole;
  personaId: string;
  anonymous: boolean;
};

export type LiveRoom = {
  id: number;
  roomCode: string;
  displayName: string;
  status: string;
  anonymousMode: boolean;
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
  elapsedMinutes: number;
  completed: boolean;
  currentStep: TimelineStep | null;
  nextStep: TimelineStep | null;
  steps: TimelineStep[];
};

export type ParticipantState = {
  socketId: string;
  personaId: string;
  authPersonaId?: string;
  agoraUid: number;
  displayName: string;
  accountRole: AccountRole;
  participantRole: ParticipantRole;
  anonymous: boolean;
  micMuted: boolean;
  handRaised: boolean;
  joinedAt: string;
};

export type RecordingConsentDecision = "APPROVED" | "REJECTED";

export type RecordingConsentResponse = {
  personaId: string;
  displayName: string;
  decision: RecordingConsentDecision;
  respondedAt: string;
};

export type RecordingConsentState = {
  id: string;
  roomCode: string;
  creatorPersonaId: string;
  creatorDisplayName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  requiredParticipantPersonaIds: string[];
  responses: RecordingConsentResponse[];
};

export type RealtimeRoomState = {
  roomCode: string;
  participants: ParticipantState[];
  currentStep: TimelineStep | null;
  nextStep: TimelineStep | null;
  completed: boolean;
  recordingConsent: RecordingConsentState | null;
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
