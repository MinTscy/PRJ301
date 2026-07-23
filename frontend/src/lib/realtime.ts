import { io, type Socket } from "socket.io-client";
import type { AccountRole, PodcastRecording } from "./api";

export const REALTIME_BASE_URL =
  process.env.NEXT_PUBLIC_REALTIME_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

export type RealtimeParticipant = {
  socketId: string;
  personaId: string;
  authPersonaId?: string;
  agoraUid: number;
  displayName: string;
  accountRole: AccountRole;
  participantRole: "audience" | "speaker" | "moderator";
  anonymous: boolean;
  micMuted: boolean;
  handRaised: boolean;
  joinedAt: string;
};

export type RealtimeRoomState = {
  roomCode: string;
  participants: RealtimeParticipant[];
  currentStep: {
    subLevelId: number;
    subOrder: number;
    title: string;
  } | null;
  nextStep: {
    subLevelId: number;
    subOrder: number;
    title: string;
  } | null;
  completed: boolean;
  recordingConsent: RecordingConsentState | null;
};

export type RecordingConsentResponse = {
  personaId: string;
  displayName: string;
  decision: "APPROVED" | "REJECTED";
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

export type RealtimeMaterialsChanged = {
  roomCode: string;
  action: "PINNED" | "UNPINNED";
  materialId: number | null;
  changedAt: string;
};

export type RealtimeAck = {
  ok: boolean;
  state?: RealtimeRoomState;
  error?: string;
};

export type AgoraTokenResponse = {
  appId: string;
  channel: string;
  uid: number;
  token: string;
  role: "audience" | "speaker";
  expiresInSeconds: number;
};

export async function requestAgoraToken(
  roomCode: string,
  personaId: string,
  role: "audience" | "speaker",
  accessToken?: string
): Promise<AgoraTokenResponse> {
  const response = await fetch(`${REALTIME_BASE_URL}/api/realtime/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({ roomCode, personaId, role })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Unable to create audio token: ${response.status}`);
  }

  return response.json() as Promise<AgoraTokenResponse>;
}

export function createRealtimeSocket(): Socket {
  return io(REALTIME_BASE_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true
  });
}

export function podcastAudioUrl(podcast: PodcastRecording): string | null {
  if (!podcast.audioUrl) return null;
  if (/^https?:\/\//i.test(podcast.audioUrl)) return podcast.audioUrl;
  return `${REALTIME_BASE_URL}${podcast.audioUrl.startsWith("/") ? "" : "/"}${podcast.audioUrl}`;
}

async function realtimeJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `${fallbackMessage}: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const realtimeApi = {
  podcasts: async (roomCode?: string) => {
    const search = roomCode ? `?roomCode=${encodeURIComponent(roomCode)}` : "";
    const response = await fetch(`${REALTIME_BASE_URL}/api/realtime/podcasts${search}`, {
      cache: "no-store"
    });

    return realtimeJson<PodcastRecording[]>(response, "Unable to load podcasts");
  },
  myPodcasts: async (token: string) => {
    const response = await fetch(`${REALTIME_BASE_URL}/api/realtime/podcasts/mine`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return realtimeJson<PodcastRecording[]>(response, "Unable to load your podcasts");
  },
  updatePodcast: async (token: string, podcastId: string, payload: { title: string }) => {
    const response = await fetch(`${REALTIME_BASE_URL}/api/realtime/podcasts/${encodeURIComponent(podcastId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return realtimeJson<PodcastRecording>(response, "Unable to update podcast");
  },
  deletePodcast: async (token: string, podcastId: string) => {
    const response = await fetch(`${REALTIME_BASE_URL}/api/realtime/podcasts/${encodeURIComponent(podcastId)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return realtimeJson<void>(response, "Unable to delete podcast");
  },
  startRecording: async (token: string, payload: { roomCode: string; title: string }) => {
    const response = await fetch(`${REALTIME_BASE_URL}/api/realtime/recordings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return realtimeJson<PodcastRecording>(response, "Unable to start recording");
  },
  uploadRecordingAudio: async (
    token: string,
    recordingId: string,
    audio: Blob,
    durationSeconds: number
  ) => {
    const response = await fetch(
      `${REALTIME_BASE_URL}/api/realtime/recordings/${encodeURIComponent(recordingId)}/audio?durationSeconds=${durationSeconds}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": audio.type || "application/octet-stream"
        },
        body: audio
      }
    );

    return realtimeJson<PodcastRecording>(response, "Unable to publish recording");
  }
};
