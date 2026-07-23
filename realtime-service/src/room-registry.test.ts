import assert from "node:assert/strict";
import test from "node:test";
import { RoomRegistry } from "./room-registry.js";
import type { ParticipantState, RoomTimeline } from "./types.js";

function participant(overrides: Partial<ParticipantState> = {}): ParticipantState {
  return {
    socketId: "socket-1",
    personaId: "persona-1",
    authPersonaId: undefined,
    agoraUid: 1001,
    displayName: "Learner",
    accountRole: "LUCY",
    participantRole: "audience",
    anonymous: false,
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

test("finds anonymous learner participants by authenticated persona", () => {
  const registry = new RoomRegistry();
  registry.join("LUCY-ROOM", participant({
    personaId: "anonymous-1",
    authPersonaId: "persona-1",
    anonymous: true
  }));

  assert.equal(registry.findParticipant("LUCY-ROOM", "anonymous-1")?.displayName, "Learner");
  assert.equal(registry.findParticipantByAuthPersonaId("LUCY-ROOM", "persona-1")?.personaId, "anonymous-1");
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

test("requires every non-creator participant to approve recording consent", () => {
  const registry = new RoomRegistry();
  registry.join("LUCY-ROOM", participant({
    socketId: "creator-socket",
    personaId: "creator",
    displayName: "Creator",
    accountRole: "LUCY_PRO",
    participantRole: "moderator"
  }));
  registry.join("LUCY-ROOM", participant({
    socketId: "learner-socket",
    personaId: "learner",
    displayName: "Learner"
  }));

  const pending = registry.requestRecordingConsent("LUCY-ROOM", "creator");
  assert.equal(pending.recordingConsent?.status, "PENDING");
  assert.deepEqual(pending.recordingConsent?.requiredParticipantPersonaIds, ["learner"]);
  assert.throws(
    () => registry.assertRecordingConsentApproved("LUCY-ROOM", "creator"),
    /requires approval/
  );

  const approved = registry.respondToRecordingConsent("LUCY-ROOM", "learner", "APPROVED");
  assert.equal(approved.recordingConsent?.status, "APPROVED");
  assert.doesNotThrow(() => registry.assertRecordingConsentApproved("LUCY-ROOM", "creator"));
});

test("a new participant joining before recording must also approve", () => {
  const registry = new RoomRegistry();
  registry.join("LUCY-ROOM", participant({
    socketId: "creator-socket",
    personaId: "creator",
    accountRole: "LUCY_PRO",
    participantRole: "moderator"
  }));
  registry.join("LUCY-ROOM", participant({ socketId: "learner-1", personaId: "learner-1" }));
  registry.requestRecordingConsent("LUCY-ROOM", "creator");
  registry.respondToRecordingConsent("LUCY-ROOM", "learner-1", "APPROVED");

  const withNewParticipant = registry.join(
    "LUCY-ROOM",
    participant({ socketId: "learner-2", personaId: "learner-2", displayName: "New Learner" })
  );

  assert.equal(withNewParticipant.recordingConsent?.status, "PENDING");
  assert.throws(
    () => registry.assertRecordingConsentApproved("LUCY-ROOM", "creator"),
    /requires approval/
  );

  registry.respondToRecordingConsent("LUCY-ROOM", "learner-2", "APPROVED");
  assert.doesNotThrow(() => registry.assertRecordingConsentApproved("LUCY-ROOM", "creator"));
});

test("a pending participant leaving no longer blocks recording consent", () => {
  const registry = new RoomRegistry();
  registry.join("LUCY-ROOM", participant({
    socketId: "creator-socket",
    personaId: "creator",
    accountRole: "LUCY_PRO",
    participantRole: "moderator"
  }));
  registry.join("LUCY-ROOM", participant({ socketId: "learner-1", personaId: "learner-1" }));
  registry.join("LUCY-ROOM", participant({ socketId: "learner-2", personaId: "learner-2" }));
  registry.requestRecordingConsent("LUCY-ROOM", "creator");
  registry.respondToRecordingConsent("LUCY-ROOM", "learner-1", "APPROVED");

  registry.leave("learner-2");

  assert.equal(registry.snapshot("LUCY-ROOM").recordingConsent?.status, "APPROVED");
  assert.doesNotThrow(() => registry.assertRecordingConsentApproved("LUCY-ROOM", "creator"));
});
