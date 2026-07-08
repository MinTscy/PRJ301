import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { RecordingStore } from "./recording-store.js";
import type { AuthUser } from "./types.js";

const creator: AuthUser = {
  id: 1,
  email: "creator@lucy.local",
  displayName: "Creator",
  role: "LUCY_SUPER",
  personaId: "creator-1",
  anonymous: false
};

test("stores an uploaded recording and reloads podcast metadata", async () => {
  const directory = mkdtempSync(join(tmpdir(), "lucy-recordings-"));
  try {
    const store = new RecordingStore(directory);
    const recording = store.start("LUCY-ROOM", "Lesson recap", creator);
    const ready = await store.attachAudio(recording.id, creator.personaId, "audio/webm", Buffer.from("audio"), 42);

    assert.equal(ready.status, "READY");
    assert.equal(ready.audioUrl, `/recordings/${recording.id}.webm`);
    assert.equal(new RecordingStore(directory).list()[0].durationSeconds, 42);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("only one active recording is allowed per room", () => {
  const directory = mkdtempSync(join(tmpdir(), "lucy-recordings-"));
  try {
    const store = new RecordingStore(directory);
    store.start("LUCY-ROOM", "First", creator);
    assert.throws(() => store.start("LUCY-ROOM", "Second", creator), /active recording/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
