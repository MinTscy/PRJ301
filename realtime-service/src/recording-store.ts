import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import type { AuthUser, PodcastRecording } from "./types.js";

export class RecordingStore {
  private readonly directory: string;
  private readonly metadataPath: string;
  private recordings: PodcastRecording[];

  constructor(directory: string) {
    this.directory = resolve(directory);
    mkdirSync(this.directory, { recursive: true });
    this.metadataPath = join(this.directory, "recordings.json");
    this.recordings = this.load();
  }

  get storageDirectory(): string {
    return this.directory;
  }

  start(roomCode: string, title: string, creator: AuthUser): PodcastRecording {
    const active = this.recordings.find(
      (item) => item.roomCode === roomCode && item.status === "RECORDING"
    );
    if (active) throw new Error("This room already has an active recording.");
    const recording: PodcastRecording = {
      id: randomUUID(),
      roomCode,
      title: title.trim(),
      creatorPersonaId: creator.personaId,
      creatorDisplayName: creator.displayName,
      status: "RECORDING",
      audioUrl: null,
      contentType: null,
      durationSeconds: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    this.recordings.push(recording);
    this.persist();
    return recording;
  }

  async attachAudio(
    id: string,
    creatorPersonaId: string,
    contentType: string,
    bytes: Buffer,
    durationSeconds: number | null
  ): Promise<PodcastRecording> {
    if (bytes.length === 0) throw new Error("Audio upload is empty.");
    const recording = this.requireOwnedRecording(id, creatorPersonaId);
    const extension = extensionFor(contentType);
    const fileName = `${recording.id}${extension}`;
    await writeFile(join(this.directory, fileName), bytes);
    const updated: PodcastRecording = {
      ...recording,
      status: "READY",
      audioUrl: `/recordings/${fileName}`,
      contentType,
      durationSeconds,
      completedAt: new Date().toISOString()
    };
    this.replace(updated);
    return updated;
  }

  completeExternal(
    id: string,
    creatorPersonaId: string,
    audioUrl: string,
    durationSeconds: number | null
  ): PodcastRecording {
    const recording = this.requireOwnedRecording(id, creatorPersonaId);
    if (!/^https?:\/\//i.test(audioUrl)) throw new Error("External audio URL must use HTTP or HTTPS.");
    const updated: PodcastRecording = {
      ...recording,
      status: "READY",
      audioUrl,
      contentType: null,
      durationSeconds,
      completedAt: new Date().toISOString()
    };
    this.replace(updated);
    return updated;
  }

  list(roomCode?: string): PodcastRecording[] {
    return this.recordings
      .filter((item) => item.status === "READY" && (!roomCode || item.roomCode === roomCode))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private requireOwnedRecording(id: string, creatorPersonaId: string): PodcastRecording {
    const recording = this.recordings.find((item) => item.id === id);
    if (!recording) throw new Error("Recording not found.");
    if (recording.creatorPersonaId !== creatorPersonaId) throw new Error("Recording belongs to another creator.");
    if (recording.status !== "RECORDING") throw new Error("Recording has already been completed.");
    return recording;
  }

  private replace(recording: PodcastRecording) {
    this.recordings = this.recordings.map((item) => item.id === recording.id ? recording : item);
    this.persist();
  }

  private load(): PodcastRecording[] {
    if (!existsSync(this.metadataPath)) return [];
    try {
      return JSON.parse(readFileSync(this.metadataPath, "utf8")) as PodcastRecording[];
    } catch {
      throw new Error(`Recording metadata is invalid: ${this.metadataPath}`);
    }
  }

  private persist() {
    const temporary = `${this.metadataPath}.tmp`;
    writeFileSync(temporary, JSON.stringify(this.recordings, null, 2), "utf8");
    renameSync(temporary, this.metadataPath);
  }
}

function extensionFor(contentType: string): string {
  if (contentType.includes("wav")) return ".wav";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return ".mp3";
  if (contentType.includes("ogg")) return ".ogg";
  if (contentType.includes("mp4") || contentType.includes("m4a")) return ".m4a";
  if (contentType.includes("webm")) return ".webm";
  const extension = extname(contentType);
  return extension || ".bin";
}
