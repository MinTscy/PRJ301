"use client";

import type { LiveRoom } from "@/lib/api";

export const ACTIVE_ROOM_SESSION_KEY = "lucy.room.active";
export const ACTIVE_ROOM_SESSION_EVENT = "lucy.room.active.changed";

export type ActiveRoomSession = Pick<
  LiveRoom,
  | "id"
  | "roomCode"
  | "displayName"
  | "status"
  | "levelId"
  | "levelNumber"
  | "levelTitle"
  | "stageNumber"
  | "languageCode"
> & {
  savedAt: string;
};

function dispatchActiveRoomSession(room: ActiveRoomSession | null) {
  window.dispatchEvent(new CustomEvent(ACTIVE_ROOM_SESSION_EVENT, { detail: room }));
}

export function roomSessionFromLiveRoom(room: LiveRoom): ActiveRoomSession {
  return {
    id: room.id,
    roomCode: room.roomCode,
    displayName: room.displayName,
    status: room.status,
    levelId: room.levelId,
    levelNumber: room.levelNumber,
    levelTitle: room.levelTitle,
    stageNumber: room.stageNumber,
    languageCode: room.languageCode,
    savedAt: new Date().toISOString()
  };
}

export function readActiveRoomSession(): ActiveRoomSession | null {
  if (typeof window === "undefined") return null;

  const value = window.localStorage.getItem(ACTIVE_ROOM_SESSION_KEY);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as ActiveRoomSession;
    if (!parsed.roomCode || !parsed.id) {
      window.localStorage.removeItem(ACTIVE_ROOM_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(ACTIVE_ROOM_SESSION_KEY);
    return null;
  }
}

export function writeActiveRoomSession(room: LiveRoom) {
  const session = roomSessionFromLiveRoom(room);
  window.localStorage.setItem(ACTIVE_ROOM_SESSION_KEY, JSON.stringify(session));
  dispatchActiveRoomSession(session);
}

export function clearActiveRoomSession(roomCode?: string) {
  const current = readActiveRoomSession();
  if (roomCode && current?.roomCode !== roomCode) return;

  window.localStorage.removeItem(ACTIVE_ROOM_SESSION_KEY);
  dispatchActiveRoomSession(null);
}
