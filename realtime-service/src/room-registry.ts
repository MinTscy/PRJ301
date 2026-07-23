import { randomUUID } from "node:crypto";
import type {
  ParticipantState,
  RealtimeRoomState,
  RecordingConsentDecision,
  RecordingConsentResponse,
  RecordingConsentState,
  RoomTimeline
} from "./types.js";

type RoomRecord = {
  participants: Map<string, ParticipantState>;
  timeline: RoomTimeline | null;
  recordingConsent: RecordingConsentState | null;
};

export class RoomRegistry {
  private readonly rooms = new Map<string, RoomRecord>();

  join(roomCode: string, participant: ParticipantState): RealtimeRoomState {
    const room = this.getOrCreate(roomCode);
    room.participants.set(participant.socketId, participant);
    this.addParticipantToPendingConsent(room, participant);
    return this.snapshot(roomCode);
  }

  leave(socketId: string): string | null {
    for (const [roomCode, room] of this.rooms) {
      const participant = room.participants.get(socketId);
      if (participant && room.participants.delete(socketId)) {
        this.removeParticipantFromConsent(room, participant.personaId);
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

  findParticipantByAuthPersonaId(roomCode: string, authPersonaId: string): ParticipantState | null {
    const room = this.rooms.get(roomCode);
    return [...(room?.participants.values() ?? [])].find((participant) => participant.authPersonaId === authPersonaId) ?? null;
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

  requestRecordingConsent(roomCode: string, creatorPersonaId: string): RealtimeRoomState {
    const room = this.getOrCreate(roomCode);
    const creator = [...room.participants.values()].find(
      (participant) => participant.personaId === creatorPersonaId
    );
    if (!creator) throw new Error("Creator must join the room before requesting recording consent.");

    const required = this.requiredRecordingConsentParticipants(room, creatorPersonaId);
    room.recordingConsent = {
      id: randomUUID(),
      roomCode,
      creatorPersonaId,
      creatorDisplayName: creator.displayName,
      status: required.length === 0 ? "APPROVED" : "PENDING",
      requestedAt: new Date().toISOString(),
      requiredParticipantPersonaIds: required.map((participant) => participant.personaId),
      responses: []
    };
    return this.snapshot(roomCode);
  }

  respondToRecordingConsent(
    roomCode: string,
    personaId: string,
    decision: RecordingConsentDecision
  ): RealtimeRoomState {
    const room = this.getOrCreate(roomCode);
    const consent = room.recordingConsent;
    if (!consent) throw new Error("No recording consent request is active for this room.");
    if (consent.status !== "PENDING") throw new Error("Recording consent request is no longer pending.");
    if (consent.creatorPersonaId === personaId) throw new Error("The recording creator does not need to approve.");
    if (!consent.requiredParticipantPersonaIds.includes(personaId)) {
      throw new Error("This participant is not required for the recording consent request.");
    }

    const participant = this.findParticipant(roomCode, personaId);
    const response: RecordingConsentResponse = {
      personaId,
      displayName: participant?.displayName ?? personaId,
      decision,
      respondedAt: new Date().toISOString()
    };
    consent.responses = [
      ...consent.responses.filter((item) => item.personaId !== personaId),
      response
    ];
    this.updateConsentStatus(room);
    return this.snapshot(roomCode);
  }

  cancelRecordingConsent(roomCode: string, creatorPersonaId: string): RealtimeRoomState {
    const room = this.getOrCreate(roomCode);
    if (room.recordingConsent?.creatorPersonaId !== creatorPersonaId) {
      throw new Error("Only the recording creator can cancel the consent request.");
    }
    room.recordingConsent = null;
    return this.snapshot(roomCode);
  }

  assertRecordingConsentApproved(roomCode: string, creatorPersonaId: string) {
    const room = this.getOrCreate(roomCode);
    const consent = room.recordingConsent;
    if (!consent || consent.creatorPersonaId !== creatorPersonaId || consent.status !== "APPROVED") {
      throw new Error("Recording requires approval from every other participant in the room.");
    }
    if (!this.findParticipant(roomCode, creatorPersonaId)) {
      throw new Error("Recording creator must still be in the room.");
    }

    const currentRequired = this.requiredRecordingConsentParticipants(room, creatorPersonaId).map(
      (participant) => participant.personaId
    );
    const approved = new Set(
      consent.responses
        .filter((response) => response.decision === "APPROVED")
        .map((response) => response.personaId)
    );
    const allApproved = currentRequired.every((personaId) => approved.has(personaId));
    if (!allApproved) {
      throw new Error("Recording requires approval from every current participant in the room.");
    }
  }

  clearRecordingConsent(roomCode: string, creatorPersonaId: string) {
    const room = this.rooms.get(roomCode);
    if (room?.recordingConsent?.creatorPersonaId === creatorPersonaId) {
      room.recordingConsent = null;
    }
  }

  snapshot(roomCode: string): RealtimeRoomState {
    const room = this.getOrCreate(roomCode);
    return {
      roomCode,
      participants: [...room.participants.values()].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
      currentStep: room.timeline?.currentStep ?? null,
      nextStep: room.timeline?.nextStep ?? null,
      completed: room.timeline?.completed ?? false,
      recordingConsent: room.recordingConsent
    };
  }

  private getOrCreate(roomCode: string): RoomRecord {
    let room = this.rooms.get(roomCode);
    if (!room) {
      room = { participants: new Map(), timeline: null, recordingConsent: null };
      this.rooms.set(roomCode, room);
    }
    return room;
  }

  private requiredRecordingConsentParticipants(room: RoomRecord, creatorPersonaId: string): ParticipantState[] {
    const uniqueParticipants = new Map<string, ParticipantState>();
    for (const participant of room.participants.values()) {
      if (participant.personaId !== creatorPersonaId) {
        uniqueParticipants.set(participant.personaId, participant);
      }
    }
    return [...uniqueParticipants.values()];
  }

  private addParticipantToPendingConsent(room: RoomRecord, participant: ParticipantState) {
    const consent = room.recordingConsent;
    if (!consent || consent.status === "REJECTED" || participant.personaId === consent.creatorPersonaId) return;

    if (!consent.requiredParticipantPersonaIds.includes(participant.personaId)) {
      consent.requiredParticipantPersonaIds = [
        ...consent.requiredParticipantPersonaIds,
        participant.personaId
      ];
      consent.status = "PENDING";
    }
  }

  private removeParticipantFromConsent(room: RoomRecord, personaId: string) {
    const consent = room.recordingConsent;
    if (!consent) return;
    if (consent.creatorPersonaId === personaId) {
      room.recordingConsent = null;
      return;
    }
    if (consent.status === "REJECTED") return;

    consent.requiredParticipantPersonaIds = consent.requiredParticipantPersonaIds.filter(
      (requiredPersonaId) => requiredPersonaId !== personaId
    );
    consent.responses = consent.responses.filter((response) => response.personaId !== personaId);
    this.updateConsentStatus(room);
  }

  private updateConsentStatus(room: RoomRecord) {
    const consent = room.recordingConsent;
    if (!consent || consent.status === "REJECTED") return;

    if (consent.responses.some((response) => response.decision === "REJECTED")) {
      consent.status = "REJECTED";
      return;
    }

    const approved = new Set(
      consent.responses
        .filter((response) => response.decision === "APPROVED")
        .map((response) => response.personaId)
    );
    consent.status = consent.requiredParticipantPersonaIds.every((personaId) => approved.has(personaId))
      ? "APPROVED"
      : "PENDING";
  }
}
