import type { AuthUser, LiveRoom, RoomTimeline } from "./types.js";

export class JavaLmsClient {
  constructor(private readonly baseUrl: string) {}

  getRoom(roomCode: string): Promise<LiveRoom> {
    return this.request<LiveRoom>(`/api/rooms/${encodeURIComponent(roomCode)}`);
  }

  getTimeline(roomCode: string): Promise<RoomTimeline> {
    return this.request<RoomTimeline>(`/api/rooms/${encodeURIComponent(roomCode)}/timeline`);
  }

  getCurrentUser(accessToken: string): Promise<AuthUser> {
    return this.request<AuthUser>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  advanceLearnerLevel(
    personaId: string,
    payload: { languageCode: string; completedLevelNumber: number; minutesInRoom: number },
    internalServiceSecret: string
  ): Promise<AuthUser> {
    return this.request<AuthUser>(`/api/auth/internal/personas/${encodeURIComponent(personaId)}/learner-level-progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LUCY-INTERNAL-SECRET": internalServiceSecret
      },
      body: JSON.stringify(payload)
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Java LMS request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
