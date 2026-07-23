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
  learnerEnglishLevel: null,
  learnerJapaneseLevel: null,
  learnerChineseLevel: null,
  role: "LUCY_SUPER",
  personaId: "creator-1",
  anonymous: false
};

const otherCreator: AuthUser = {
  ...creator,
  id: 2,
  email: "other@lucy.local",
  displayName: "Other Creator",
  personaId: "creator-2"
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

test("creator can list and rename owned podcasts", async () => {
  const directory = mkdtempSync(join(tmpdir(), "lucy-recordings-"));
  try {
    const store = new RecordingStore(directory);
    const recording = store.start("LUCY-ROOM", "Original title", creator);
    await store.attachAudio(recording.id, creator.personaId, "audio/webm", Buffer.from("audio"), 42);

    const renamed = store.updateMetadata(recording.id, creator.personaId, "Updated title");

    assert.equal(renamed.title, "Updated title");
    assert.equal(store.listOwned(creator.personaId)[0].title, "Updated title");
    assert.deepEqual(store.listOwned(otherCreator.personaId), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("creator cannot manage another creator podcast", async () => {
  const directory = mkdtempSync(join(tmpdir(), "lucy-recordings-"));
  try {
    const store = new RecordingStore(directory);
    const recording = store.start("LUCY-ROOM", "Owned title", creator);
    await store.attachAudio(recording.id, creator.personaId, "audio/webm", Buffer.from("audio"), 42);

    assert.throws(
      () => store.updateMetadata(recording.id, otherCreator.personaId, "Stolen title"),
      /another creator/
    );
    assert.throws(() => store.delete(recording.id, otherCreator.personaId), /another creator/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("creator can delete owned podcasts", async () => {
  const directory = mkdtempSync(join(tmpdir(), "lucy-recordings-"));
  try {
    const store = new RecordingStore(directory);
    const recording = store.start("LUCY-ROOM", "Delete me", creator);
    await store.attachAudio(recording.id, creator.personaId, "audio/webm", Buffer.from("audio"), 42);

    const deleted = store.delete(recording.id, creator.personaId);

    assert.equal(deleted.id, recording.id);
    assert.deepEqual(store.listOwned(creator.personaId), []);
    assert.deepEqual(new RecordingStore(directory).listOwned(creator.personaId), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
