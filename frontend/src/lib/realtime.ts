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

export const realtimeApi = {
  podcasts: async (roomCode?: string) => {
    const search = roomCode ? `?roomCode=${encodeURIComponent(roomCode)}` : "";
    const response = await fetch(`${REALTIME_BASE_URL}/api/realtime/podcasts${search}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? `Unable to load podcasts: ${response.status}`);
    }

    return response.json() as Promise<PodcastRecording[]>;
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

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? `Unable to start recording: ${response.status}`);
    }

    return response.json() as Promise<PodcastRecording>;
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

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? `Unable to publish recording: ${response.status}`);
    }

    return response.json() as Promise<PodcastRecording>;
  },
  deletePodcast: async (token: string, id: string) => {
    const response = await fetch(`${REALTIME_BASE_URL}/api/realtime/podcasts/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? `Unable to delete podcast: ${response.status}`);
    }

    return response.json() as Promise<PodcastRecording>;
  }
};
