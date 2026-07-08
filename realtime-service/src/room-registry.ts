import type { ParticipantState, RealtimeRoomState, RoomTimeline } from "./types.js";

type RoomRecord = {
  participants: Map<string, ParticipantState>;
  timeline: RoomTimeline | null;
};

export class RoomRegistry {
  private readonly rooms = new Map<string, RoomRecord>();

  join(roomCode: string, participant: ParticipantState): RealtimeRoomState {
    const room = this.getOrCreate(roomCode);
    room.participants.set(participant.socketId, participant);
    return this.snapshot(roomCode);
  }

  leave(socketId: string): string | null {
    for (const [roomCode, room] of this.rooms) {
      if (room.participants.delete(socketId)) {
        if (room.participants.size === 0 && room.timeline?.completed) {
          this.rooms.delete(roomCode);
        }
        return roomCode;
      }
    }
    return null;
  }

  updateParticipant(socketId: string, update: Partial<ParticipantState>): { roomCode: string; state: RealtimeRoomState } | null {
    for (const [roomCode, room] of this.rooms) {
      const participant = room.participants.get(socketId);
      if (participant) {
        room.participants.set(socketId, { ...participant, ...update, socketId });
        return { roomCode, state: this.snapshot(roomCode) };
      }
    }
    return null;
  }

  findParticipant(roomCode: string, personaId: string): ParticipantState | null {
    const room = this.rooms.get(roomCode);
    return [...(room?.participants.values() ?? [])].find((participant) => participant.personaId === personaId) ?? null;
  }

  updateTimeline(roomCode: string, timeline: RoomTimeline): { changed: boolean; previousStep: number | null } {
    const room = this.getOrCreate(roomCode);
    const previousStep = room.timeline?.currentStep?.subOrder ?? null;
    const nextStep = timeline.currentStep?.subOrder ?? null;
    room.timeline = timeline;
    return { changed: previousStep !== nextStep, previousStep };
  }

  activeRoomCodes(): string[] {
    return [...this.rooms.keys()];
  }

  snapshot(roomCode: string): RealtimeRoomState {
    const room = this.getOrCreate(roomCode);
    return {
      roomCode,
      participants: [...room.participants.values()].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
      currentStep: room.timeline?.currentStep ?? null,
      nextStep: room.timeline?.nextStep ?? null,
      completed: room.timeline?.completed ?? false
    };
  }

  private getOrCreate(roomCode: string): RoomRecord {
    let room = this.rooms.get(roomCode);
    if (!room) {
      room = { participants: new Map(), timeline: null };
      this.rooms.set(roomCode, room);
    }
    return room;
  }
}
