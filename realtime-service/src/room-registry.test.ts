import assert from "node:assert/strict";
import test from "node:test";
import { RoomRegistry } from "./room-registry.js";
import type { ParticipantState, RoomTimeline } from "./types.js";

function participant(overrides: Partial<ParticipantState> = {}): ParticipantState {
  return {
    socketId: "socket-1",
    personaId: "persona-1",
    agoraUid: 1001,
    displayName: "Learner",
    accountRole: "LUCY",
    participantRole: "audience",
    micMuted: true,
    handRaised: false,
    joinedAt: "2026-06-18T00:00:00Z",
    ...overrides
  };
}

test("tracks room participants and moderation state", () => {
  const registry = new RoomRegistry();
  registry.join("LUCY-ROOM", participant());

  const raised = registry.updateParticipant("socket-1", { handRaised: true });
  assert.equal(raised?.state.participants[0].handRaised, true);

  const approved = registry.updateParticipant("socket-1", {
    handRaised: false,
    participantRole: "speaker"
  });
  assert.equal(approved?.state.participants[0].participantRole, "speaker");
});

test("detects timeline step transitions", () => {
  const registry = new RoomRegistry();
  const timeline = (subOrder: number): RoomTimeline => ({
    roomId: 1,
    roomCode: "LUCY-ROOM",
    levelNumber: 1,
    levelTitle: "Survival Speaking",
    elapsedMinutes: subOrder * 10,
    completed: false,
    currentStep: {
      subLevelId: subOrder,
      subOrder,
      title: `Topic ${subOrder}`,
      durationMinutes: 10,
      startMinute: (subOrder - 1) * 10,
      endMinute: subOrder * 10,
      current: true
    },
    nextStep: null,
    steps: []
  });

  assert.equal(registry.updateTimeline("LUCY-ROOM", timeline(1)).changed, true);
  assert.equal(registry.updateTimeline("LUCY-ROOM", timeline(1)).changed, false);
  assert.equal(registry.updateTimeline("LUCY-ROOM", timeline(2)).changed, true);
});
