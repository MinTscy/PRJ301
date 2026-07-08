import assert from "node:assert/strict";
import test from "node:test";
import { AgoraTokenService } from "./agora-token-service.js";

test("maps a persona to a stable non-zero Agora uid", () => {
  const service = new AgoraTokenService({
    appId: "",
    appCertificate: "",
    ttlSeconds: 3600
  });

  const first = service.toAgoraUid("persona_level_1");
  const second = service.toAgoraUid("persona_level_1");

  assert.equal(first, second);
  assert.ok(first > 0);
});

test("rejects token generation when Agora credentials are missing", () => {
  const service = new AgoraTokenService({
    appId: "",
    appCertificate: "",
    ttlSeconds: 3600
  });

  assert.throws(
    () => service.createToken("LUCY-ROOM", "persona_level_1", "audience"),
    /Agora is not configured/
  );
});

test("builds an AccessToken2 payload when credentials are configured", () => {
  const service = new AgoraTokenService({
    appId: "0123456789abcdef0123456789abcdef",
    appCertificate: "abcdef0123456789abcdef0123456789",
    ttlSeconds: 3600
  });

  const result = service.createToken("LUCY-ROOM", "persona_level_1", "speaker");

  assert.equal(result.channel, "LUCY-ROOM");
  assert.equal(result.role, "speaker");
  assert.ok(result.token.startsWith("007"));
});
