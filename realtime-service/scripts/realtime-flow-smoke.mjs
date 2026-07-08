import { io } from "socket.io-client";

const javaBaseUrl = (process.env.JAVA_LMS_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const realtimeUrl = (process.env.REALTIME_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

async function jsonRequest(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json();
}

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (error, response) => {
      if (error) reject(error);
      else if (!response?.ok) reject(new Error(response?.error ?? `${event} failed`));
      else resolve(response);
    });
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const socket = io(realtimeUrl, { transports: ["websocket"], forceNew: true });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

const room = await jsonRequest(`${javaBaseUrl}/api/rooms/survival-speaking`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    languageCode: "EN",
    levelNumber: 1,
    displayName: "Realtime Flow Smoke Test"
  })
});

const login = await jsonRequest(`${javaBaseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "mentor@lucy.local",
    password: "ChangeMe123!"
  })
});

const learner = await connect();
const moderator = await connect();

try {
  await emit(learner, "room:join", {
    roomCode: room.roomCode,
    personaId: "persona_smoke_learner",
    displayName: "Smoke Learner"
  });
  await emit(moderator, "room:join", {
    roomCode: room.roomCode,
    personaId: login.user.personaId,
    displayName: login.user.displayName,
    accessToken: login.accessToken
  });
  const raised = await emit(learner, "hand:raise", {});
  const waiting = raised.state.participants.find((item) => item.personaId === "persona_smoke_learner");
  if (!waiting?.handRaised) throw new Error("Learner hand was not raised");

  const approved = await emit(moderator, "moderation:approve-speaker", {
    roomCode: room.roomCode,
    personaId: "persona_smoke_learner"
  });
  const speaker = approved.state.participants.find((item) => item.personaId === "persona_smoke_learner");
  if (speaker?.participantRole !== "speaker") throw new Error("Learner was not approved as speaker");

  const unmuted = await emit(learner, "mic:set", { muted: false });
  const liveSpeaker = unmuted.state.participants.find((item) => item.personaId === "persona_smoke_learner");
  if (liveSpeaker?.micMuted) throw new Error("Approved speaker could not unmute");
  if (!Number.isInteger(liveSpeaker?.agoraUid)) throw new Error("Participant Agora UID is missing");

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        roomCode: room.roomCode,
        participants: unmuted.state.participants.length,
        learnerRole: liveSpeaker.participantRole,
        learnerMicMuted: liveSpeaker.micMuted
      },
      null,
      2
    )
  );
} finally {
  learner.disconnect();
  moderator.disconnect();
}
