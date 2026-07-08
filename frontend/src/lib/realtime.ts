import { io, type Socket } from "socket.io-client";
import type { AccountRole } from "./api";

export const REALTIME_BASE_URL =
  process.env.NEXT_PUBLIC_REALTIME_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

export type RealtimeParticipant = {
  socketId: string;
  personaId: string;
  agoraUid: number;
  displayName: string;
  accountRole: AccountRole;
  participantRole: "audience" | "speaker" | "moderator";
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
