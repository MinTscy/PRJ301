import { createServer, type Server as HttpServer } from "node:http";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { Server as SocketServer, type Socket } from "socket.io";
import { z } from "zod";
import type { RealtimeConfig } from "./config.js";
import { AgoraTokenService } from "./agora-token-service.js";
import { JavaLmsClient } from "./java-client.js";
import { RoomRegistry } from "./room-registry.js";
import { StageMonitor } from "./stage-monitor.js";
import { buildTopicTimeline } from "./topic-timeline.js";
import { RecordingStore } from "./recording-store.js";
import type { AccountRole, AuthUser, GiftEvent, LiveRoom, ParticipantRole, ParticipantState } from "./types.js";

const tokenRequestSchema = z.object({
  roomCode: z.string().trim().min(1).max(50),
  personaId: z.string().trim().min(3).max(80),
  role: z.enum(["audience", "speaker"]).default("audience")
});

const joinSchema = z.object({
  roomCode: z.string().trim().min(1).max(50),
  personaId: z.string().trim().min(3).max(80),
  displayName: z.string().trim().min(1).max(120),
  accessToken: z.string().optional(),
  anonymous: z.boolean().default(false)
});

const micSchema = z.object({ muted: z.boolean() });
const moderationSchema = z.object({
  roomCode: z.string().trim().min(1).max(50),
  personaId: z.string().trim().min(3).max(80)
});
const recordingStartSchema = z.object({
  roomCode: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(160)
});
const recordingConsentResponseSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"])
});
const podcastUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160)
});
const recordingCompleteSchema = z.object({
  audioUrl: z.string().url(),
  durationSeconds: z.number().int().positive().max(86400).nullable().default(null)
});
const materialsChangedSchema = z.object({
  action: z.enum(["PINNED", "UNPINNED"]),
  materialId: z.number().int().positive().nullable().default(null)
});
const giftEventSchema = z.object({
  id: z.string().min(1),
  roomCode: z.string().trim().min(1).max(50),
  senderUserId: z.number().int().positive(),
  senderPersonaId: z.string().min(1),
  senderDisplayName: z.string().min(1),
  recipientPersonaId: z.string().min(1),
  giftCode: z.string().min(1),
  giftName: z.string().min(1),
  emoji: z.string().min(1),
  value: z.number().int().positive(),
  createdAt: z.string().datetime({ offset: true })
});
const giftTransferSchema = z.object({
  roomCode: z.string().trim().min(1).max(50),
  senderPersonaId: z.string().trim().min(1).max(80),
  recipientPersonaId: z.string().trim().min(1).max(80)
});

type Ack = (payload: { ok: boolean; state?: unknown; error?: string }) => void;

export type RealtimeApplication = {
  httpServer: HttpServer;
  io: SocketServer;
  registry: RoomRegistry;
  stageMonitor: StageMonitor;
  recordings: RecordingStore;
};

export function createRealtimeApplication(runtimeConfig: RealtimeConfig): RealtimeApplication {
  const javaClient = new JavaLmsClient(runtimeConfig.javaBaseUrl);
  const agoraTokens = new AgoraTokenService({
    appId: runtimeConfig.agoraAppId,
    appCertificate: runtimeConfig.agoraAppCertificate,
    ttlSeconds: runtimeConfig.agoraTokenTtlSeconds
  });
  const registry = new RoomRegistry();
  const recordings = new RecordingStore(runtimeConfig.recordingsDir);
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: {
      origin: runtimeConfig.frontendOrigins,
      methods: ["GET", "POST"]
    }
  });
  const stageMonitor = new StageMonitor(
    io,
    javaClient,
    registry,
    runtimeConfig.stagePollIntervalMs,
    runtimeConfig.topicDurationMinutes
  );
  const learnerLevelTimers = new Map<string, NodeJS.Timeout>();

  app.use(cors({ origin: runtimeConfig.frontendOrigins }));
  app.use(express.json());
  app.use("/recordings", express.static(recordings.storageDirectory, {
    fallthrough: false,
    immutable: true,
    maxAge: "1h"
  }));

  app.get("/health", (_request, response) => {
    response.json({
      status: "UP",
      service: "lucy-realtime-service",
      agoraConfigured: agoraTokens.configured,
      javaLmsBaseUrl: runtimeConfig.javaBaseUrl
    });
  });

  app.get("/api/realtime/rooms/:roomCode/state", async (request, response, next) => {
    try {
      await javaClient.getRoom(request.params.roomCode);
      response.json(registry.snapshot(request.params.roomCode));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/realtime/token", async (request, response, next) => {
    try {
      const payload = tokenRequestSchema.parse(request.body);
      await javaClient.getRoom(payload.roomCode);
      const authUser = await resolveOptionalUser(request, javaClient);
      authorizeAudioRole(payload.roomCode, payload.personaId, payload.role, authUser, registry);
      response.json(agoraTokens.createToken(payload.roomCode, payload.personaId, payload.role));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/realtime/podcasts", (request, response) => {
    const roomCode = typeof request.query.roomCode === "string" ? request.query.roomCode.trim().toUpperCase() : undefined;
    response.json(recordings.list(roomCode));
  });

  app.get("/api/realtime/podcasts/mine", async (request, response, next) => {
    try {
      const user = await requireUser(request, javaClient, ["LUCY_PRO", "LUCY_SUPER"]);
      response.json(recordings.listOwned(user.personaId));
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/realtime/podcasts/:id", async (request, response, next) => {
    try {
      const user = await requireUser(request, javaClient, ["LUCY_PRO", "LUCY_SUPER"]);
      const payload = podcastUpdateSchema.parse(request.body);
      response.json(recordings.updateMetadata(request.params.id, user.personaId, payload.title));
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/realtime/podcasts/:id", async (request, response, next) => {
    try {
      const user = await requireUser(request, javaClient, ["LUCY_PRO", "LUCY_SUPER"]);
      recordings.delete(request.params.id, user.personaId);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/realtime/recordings", async (request, response, next) => {
    try {
      const user = await requireUser(request, javaClient, ["LUCY_PRO", "LUCY_SUPER"]);
      const payload = recordingStartSchema.parse(request.body);
      const room = await javaClient.getRoom(payload.roomCode);
      registry.assertRecordingConsentApproved(room.roomCode, user.personaId);
      const recording = recordings.start(room.roomCode, payload.title, user);
      registry.clearRecordingConsent(room.roomCode, user.personaId);
      io.to(room.roomCode).emit("room:state", registry.snapshot(room.roomCode));
      response.status(201).json(recording);
    } catch (error) {
      next(error);
    }
  });

  app.put(
    "/api/realtime/recordings/:id/audio",
    express.raw({ type: ["audio/*", "application/octet-stream"], limit: "100mb" }),
    async (request, response, next) => {
      try {
        const user = await requireUser(request, javaClient, ["LUCY_PRO", "LUCY_SUPER"]);
        const duration = request.query.durationSeconds ? Number(request.query.durationSeconds) : null;
        if (duration !== null && (!Number.isInteger(duration) || duration <= 0 || duration > 86400)) {
          throw new Error("durationSeconds must be a positive integer up to 86400.");
        }
        response.json(await recordings.attachAudio(
          request.params.id,
          user.personaId,
          request.header("Content-Type") ?? "application/octet-stream",
          Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0),
          duration
        ));
      } catch (error) {
        next(error);
      }
    }
  );

  app.post("/api/realtime/recordings/:id/complete", async (request, response, next) => {
    try {
      const user = await requireUser(request, javaClient, ["LUCY_PRO", "LUCY_SUPER"]);
      const payload = recordingCompleteSchema.parse(request.body);
      response.json(recordings.completeExternal(
        request.params.id, user.personaId, payload.audioUrl, payload.durationSeconds));
    } catch (error) {
      next(error);
    }
  });

  app.post("/internal/gifts/validate", async (request, response, next) => {
    try {
      if (request.header("X-LUCY-INTERNAL-SECRET") !== runtimeConfig.internalServiceSecret) {
        response.status(401).json({ message: "Invalid internal service secret." });
        return;
      }
      const payload = giftTransferSchema.parse(request.body);
      const roomCode = payload.roomCode.trim().toUpperCase();
      const sender =
        registry.findParticipant(roomCode, payload.senderPersonaId) ??
        registry.findParticipantByAuthPersonaId(roomCode, payload.senderPersonaId);
      const host = registry.snapshot(roomCode).participants.find(
        (participant) => participant.participantRole === "moderator"
      );
      if (!sender || sender.accountRole !== "LUCY") {
        response.status(409).json({ message: "Only a learner currently in the room can send this gift." });
        return;
      }
      if (!host || host.personaId !== payload.recipientPersonaId) {
        response.status(409).json({ message: "The room host is not available to receive this gift." });
        return;
      }
      response.json({ valid: true, hostPersonaId: host.personaId });
    } catch (error) {
      next(error);
    }
  });

  app.post("/internal/gifts", async (request, response, next) => {
    try {
      if (request.header("X-LUCY-INTERNAL-SECRET") !== runtimeConfig.internalServiceSecret) {
        response.status(401).json({ message: "Invalid internal service secret." });
        return;
      }
      const gift = giftEventSchema.parse(request.body) as GiftEvent;
      const room = await javaClient.getRoom(gift.roomCode);
      io.to(room.roomCode).emit("gift:received", gift);
      response.status(202).json({ delivered: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/internal/rooms/:roomCode/materials/changed", async (request, response, next) => {
    try {
      if (request.header("X-LUCY-INTERNAL-SECRET") !== runtimeConfig.internalServiceSecret) {
        response.status(401).json({ message: "Invalid internal service secret." });
        return;
      }
      const payload = materialsChangedSchema.parse(request.body);
      const roomCode = request.params.roomCode.trim().toUpperCase();
      const event = {
        roomCode,
        action: payload.action,
        materialId: payload.materialId,
        changedAt: new Date().toISOString()
      };
      io.to(roomCode).emit("materials:changed", event);
      response.status(202).json({ delivered: true, ...event });
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    socket.on("room:join", async (rawPayload: unknown, ack: Ack = () => undefined) => {
      try {
        const payload = joinSchema.parse(rawPayload);
        const room = await javaClient.getRoom(payload.roomCode);
        const authUser = payload.accessToken ? await javaClient.getCurrentUser(payload.accessToken) : null;
        validateLearnerRoomAccess(room, authUser);
        const accountRole: AccountRole = authUser?.role ?? "LUCY";
        const participantRole: ParticipantRole =
          accountRole === "LUCY_PRO" || accountRole === "LUCY_SUPER" ? "moderator" : "audience";
        const anonymous = accountRole === "LUCY" && payload.anonymous;
        const personaId = anonymous ? payload.personaId : authUser?.personaId ?? payload.personaId;
        const displayName = anonymous ? payload.displayName : authUser?.displayName ?? payload.displayName;
        const participant: ParticipantState = {
          socketId: socket.id,
          personaId,
          authPersonaId: authUser?.personaId,
          agoraUid: agoraTokens.toAgoraUid(personaId),
          displayName,
          accountRole,
          participantRole,
          anonymous,
          micMuted: participantRole === "audience",
          handRaised: false,
          joinedAt: new Date().toISOString()
        };

        socket.data.roomCode = room.roomCode;
        socket.data.personaId = participant.personaId;
        socket.data.authPersonaId = authUser?.personaId;
        socket.data.accountRole = participant.accountRole;
        socket.join(room.roomCode);
        const state = registry.join(room.roomCode, participant);
        const javaTimeline = await javaClient.getTimeline(room.roomCode);
        const timeline = buildTopicTimeline(javaTimeline, runtimeConfig.topicDurationMinutes);
        registry.updateTimeline(room.roomCode, timeline);
        io.to(room.roomCode).emit("room:state", registry.snapshot(room.roomCode));
        socket.emit("timeline:updated", timeline);
        scheduleLearnerLevelProgress(socket, room, authUser, javaClient, runtimeConfig.internalServiceSecret, runtimeConfig.learnerLevelUpMinutes, learnerLevelTimers);
        ack({ ok: true, state });
      } catch (error) {
        ack({ ok: false, error: errorMessage(error) });
      }
    });

    socket.on("mic:set", (rawPayload: unknown, ack: Ack = () => undefined) => {
      try {
        const payload = micSchema.parse(rawPayload);
        const participant = currentParticipant(socket, registry);
        if (!payload.muted && participant.participantRole === "audience") {
          throw new Error("Raise your hand and wait for moderator approval before enabling the microphone.");
        }
        const result = registry.updateParticipant(socket.id, { micMuted: payload.muted });
        if (!result) throw new Error("Join a room before changing microphone state.");
        io.to(result.roomCode).emit("room:state", result.state);
        ack({ ok: true, state: result.state });
      } catch (error) {
        ack({ ok: false, error: errorMessage(error) });
      }
    });

    socket.on("hand:raise", (_payload: unknown, ack: Ack = () => undefined) => {
      updateHand(socket, registry, io, true, ack);
    });

    socket.on("hand:lower", (_payload: unknown, ack: Ack = () => undefined) => {
      updateHand(socket, registry, io, false, ack);
    });

    socket.on("moderation:approve-speaker", (rawPayload: unknown, ack: Ack = () => undefined) => {
      moderateSpeaker(socket, rawPayload, true, registry, io, ack);
    });

    socket.on("moderation:move-to-audience", (rawPayload: unknown, ack: Ack = () => undefined) => {
      moderateSpeaker(socket, rawPayload, false, registry, io, ack);
    });

    socket.on("recording:consent-request", (_payload: unknown, ack: Ack = () => undefined) => {
      try {
        const participant = currentParticipant(socket, registry);
        if (participant.accountRole !== "LUCY_PRO" && participant.accountRole !== "LUCY_SUPER") {
          throw new Error("Only Pro or Super accounts can request recording consent.");
        }
        const roomCode = socket.data.roomCode as string | undefined;
        if (!roomCode) throw new Error("Join a room before requesting recording consent.");
        const state = registry.requestRecordingConsent(roomCode, participant.personaId);
        io.to(roomCode).emit("room:state", state);
        ack({ ok: true, state });
      } catch (error) {
        ack({ ok: false, error: errorMessage(error) });
      }
    });

    socket.on("recording:consent-response", (rawPayload: unknown, ack: Ack = () => undefined) => {
      try {
        const participant = currentParticipant(socket, registry);
        const roomCode = socket.data.roomCode as string | undefined;
        if (!roomCode) throw new Error("Join a room before responding to recording consent.");
        const payload = recordingConsentResponseSchema.parse(rawPayload);
        const state = registry.respondToRecordingConsent(roomCode, participant.personaId, payload.decision);
        io.to(roomCode).emit("room:state", state);
        ack({ ok: true, state });
      } catch (error) {
        ack({ ok: false, error: errorMessage(error) });
      }
    });

    socket.on("recording:consent-cancel", (_payload: unknown, ack: Ack = () => undefined) => {
      try {
        const participant = currentParticipant(socket, registry);
        const roomCode = socket.data.roomCode as string | undefined;
        if (!roomCode) throw new Error("Join a room before cancelling recording consent.");
        const state = registry.cancelRecordingConsent(roomCode, participant.personaId);
        io.to(roomCode).emit("room:state", state);
        ack({ ok: true, state });
      } catch (error) {
        ack({ ok: false, error: errorMessage(error) });
      }
    });

    socket.on("disconnect", () => {
      clearLearnerLevelTimer(socket.id, learnerLevelTimers);
      const roomCode = registry.leave(socket.id);
      if (roomCode) io.to(roomCode).emit("room:state", registry.snapshot(roomCode));
    });
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const message = errorMessage(error);
    const status = message.includes("not configured") ? 503 : message.includes("not found") ? 404 : 400;
    response.status(status).json({ message });
  });

  stageMonitor.start();
  return { httpServer, io, registry, stageMonitor, recordings };
}

async function requireUser(
  request: Request,
  javaClient: JavaLmsClient,
  roles: AccountRole[]
): Promise<AuthUser> {
  const authorization = request.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Authorization bearer token is required.");
  const user = await javaClient.getCurrentUser(authorization.substring("Bearer ".length).trim());
  if (!roles.includes(user.role)) throw new Error(`Only ${roles.join(" or ")} accounts can perform this action.`);
  return user;
}

function updateHand(
  socket: Socket,
  registry: RoomRegistry,
  io: SocketServer,
  handRaised: boolean,
  ack: Ack
) {
  const result = registry.updateParticipant(socket.id, { handRaised });
  if (!result) {
    ack({ ok: false, error: "Join a room before changing hand state." });
    return;
  }
  io.to(result.roomCode).emit("room:state", result.state);
  ack({ ok: true, state: result.state });
}

function moderateSpeaker(
  socket: Socket,
  rawPayload: unknown,
  approve: boolean,
  registry: RoomRegistry,
  io: SocketServer,
  ack: Ack
) {
  try {
    if (socket.data.accountRole !== "LUCY_PRO" && socket.data.accountRole !== "LUCY_SUPER") {
      throw new Error("Only Pro or Super accounts can moderate speakers.");
    }
    const payload = moderationSchema.parse(rawPayload);
    if (socket.data.roomCode !== payload.roomCode) {
      throw new Error("Moderator must join the target room first.");
    }
    const target = registry.findParticipant(payload.roomCode, payload.personaId);
    if (!target) throw new Error("Participant not found in room.");
    const result = registry.updateParticipant(target.socketId, {
      participantRole: approve ? "speaker" : "audience",
      micMuted: approve ? target.micMuted : true,
      handRaised: false
    });
    if (!result) throw new Error("Unable to update participant.");
    io.to(payload.roomCode).emit("room:state", result.state);
    io.to(target.socketId).emit(approve ? "moderation:approved" : "moderation:moved-to-audience", {
      roomCode: payload.roomCode
    });
    ack({ ok: true, state: result.state });
  } catch (error) {
    ack({ ok: false, error: errorMessage(error) });
  }
}

function currentParticipant(socket: Socket, registry: RoomRegistry): ParticipantState {
  const roomCode = socket.data.roomCode as string | undefined;
  const personaId = socket.data.personaId as string | undefined;
  if (!roomCode || !personaId) throw new Error("Join a room first.");
  const participant = registry.findParticipant(roomCode, personaId);
  if (!participant) throw new Error("Participant state not found.");
  return participant;
}

async function resolveOptionalUser(request: Request, javaClient: JavaLmsClient): Promise<AuthUser | null> {
  const authorization = request.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return javaClient.getCurrentUser(authorization.substring("Bearer ".length).trim());
}

function authorizeAudioRole(
  roomCode: string,
  personaId: string,
  requestedRole: "audience" | "speaker",
  authUser: AuthUser | null,
  registry: RoomRegistry
) {
  const participant = registry.findParticipant(roomCode, personaId);
  if (authUser && authUser.personaId !== personaId) {
    if (authUser.role !== "LUCY" || !participant?.anonymous || participant.authPersonaId !== authUser.personaId) {
      throw new Error("Token persona does not match requested persona.");
    }
  }
  if (requestedRole === "audience") return;
  if (authUser?.role === "LUCY_PRO" || authUser?.role === "LUCY_SUPER") return;
  if (participant?.participantRole !== "speaker") {
    throw new Error("Speaker token requires moderator approval.");
  }
}

function validateLearnerRoomAccess(room: LiveRoom, authUser: AuthUser | null) {
  if (authUser?.role === "LUCY_PRO" || authUser?.role === "LUCY_SUPER") return;
  if (!authUser) {
    throw new Error("A learner account is required before joining a room.");
  }
  if (authUser.role !== "LUCY") {
    throw new Error("Unsupported account role for room access.");
  }

  const learnerLevel = learnerLevelForLanguage(authUser, room.languageCode);
  const requiredLevel = Math.max(1, room.levelNumber - 1);
  if (learnerLevel < requiredLevel) {
    throw new Error(
      `Your ${room.languageCode} learner level is ${learnerLevel}. This room requires level ${requiredLevel} or higher.`
    );
  }
}

function scheduleLearnerLevelProgress(
  socket: Socket,
  room: LiveRoom,
  authUser: AuthUser | null,
  javaClient: JavaLmsClient,
  internalServiceSecret: string,
  learnerLevelUpMinutes: number,
  learnerLevelTimers: Map<string, NodeJS.Timeout>
) {
  clearLearnerLevelTimer(socket.id, learnerLevelTimers);
  if (authUser?.role !== "LUCY") return;

  const learnerLevel = learnerLevelForLanguage(authUser, room.languageCode);
  if (learnerLevel !== room.levelNumber) return;

  const timer = setTimeout(() => {
    const activeRoomCode = socket.data.roomCode as string | undefined;
    if (activeRoomCode !== room.roomCode || !socket.connected) return;

    javaClient.advanceLearnerLevel(
      authUser.personaId,
      {
        languageCode: room.languageCode,
        completedLevelNumber: room.levelNumber,
        minutesInRoom: learnerLevelUpMinutes
      },
      internalServiceSecret
    )
      .then((updatedUser) => {
        socket.emit("learner:level-updated", {
          roomCode: room.roomCode,
          languageCode: room.languageCode,
          completedLevelNumber: room.levelNumber,
          user: updatedUser
        });
      })
      .catch((error) => {
        socket.emit("realtime:error", { message: errorMessage(error) });
      })
      .finally(() => clearLearnerLevelTimer(socket.id, learnerLevelTimers));
  }, learnerLevelUpMinutes * 60 * 1000);

  learnerLevelTimers.set(socket.id, timer);
}

function clearLearnerLevelTimer(socketId: string, learnerLevelTimers: Map<string, NodeJS.Timeout>) {
  const timer = learnerLevelTimers.get(socketId);
  if (timer) clearTimeout(timer);
  learnerLevelTimers.delete(socketId);
}

function learnerLevelForLanguage(user: AuthUser, languageCode: string): number {
  const normalized = languageCode.trim().toUpperCase();
  const level =
    normalized === "EN"
      ? user.learnerEnglishLevel
      : normalized === "JA"
        ? user.learnerJapaneseLevel
        : normalized === "ZH"
          ? user.learnerChineseLevel
          : null;
  return Math.max(1, Math.min(100, level ?? 1));
}

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(", ");
  }
  return error instanceof Error ? error.message : "Unexpected realtime service error";
}
