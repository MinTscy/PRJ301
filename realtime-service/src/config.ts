import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  JAVA_LMS_BASE_URL: z.string().url().default("http://localhost:8080"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  AGORA_APP_ID: z.string().default(""),
  AGORA_APP_CERTIFICATE: z.string().default(""),
  AGORA_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(3600),
  STAGE_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  TOPIC_DURATION_MINUTES: z.coerce.number().int().min(1).default(10),
  LEARNER_LEVEL_UP_MINUTES: z.coerce.number().int().min(1).default(10),
  RECORDINGS_DIR: z.string().default("./data/recordings"),
  INTERNAL_SERVICE_SECRET: z.string().min(12).default("lucy-local-internal-secret")
});

const parsed = environmentSchema.parse(process.env);

export const config = {
  port: parsed.PORT,
  javaBaseUrl: parsed.JAVA_LMS_BASE_URL.replace(/\/$/, ""),
  frontendOrigins: parsed.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()),
  agoraAppId: parsed.AGORA_APP_ID,
  agoraAppCertificate: parsed.AGORA_APP_CERTIFICATE,
  agoraTokenTtlSeconds: parsed.AGORA_TOKEN_TTL_SECONDS,
  stagePollIntervalMs: parsed.STAGE_POLL_INTERVAL_MS,
  topicDurationMinutes: parsed.TOPIC_DURATION_MINUTES,
  learnerLevelUpMinutes: parsed.LEARNER_LEVEL_UP_MINUTES,
  recordingsDir: parsed.RECORDINGS_DIR,
  internalServiceSecret: parsed.INTERNAL_SERVICE_SECRET
};

export type RealtimeConfig = typeof config;
