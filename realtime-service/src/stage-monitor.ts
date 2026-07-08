import type { Server } from "socket.io";
import type { JavaLmsClient } from "./java-client.js";
import type { RoomRegistry } from "./room-registry.js";
import { buildTopicTimeline } from "./topic-timeline.js";

export class StageMonitor {
  private timer: NodeJS.Timeout | null = null;
  private polling = false;

  constructor(
    private readonly io: Server,
    private readonly javaClient: JavaLmsClient,
    private readonly registry: RoomRegistry,
    private readonly intervalMs: number,
    private readonly topicDurationMinutes: number
  ) {}

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
    this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      await Promise.all(
        this.registry.activeRoomCodes().map(async (roomCode) => {
          try {
            const javaTimeline = await this.javaClient.getTimeline(roomCode);
            const timeline = buildTopicTimeline(javaTimeline, this.topicDurationMinutes);
            const result = this.registry.updateTimeline(roomCode, timeline);
            this.io.to(roomCode).emit("timeline:updated", timeline);
            if (result.changed) {
              this.io.to(roomCode).emit("stage:changed", {
                roomCode,
                previousSubOrder: result.previousStep,
                currentStep: timeline.currentStep,
                nextStep: timeline.nextStep,
                completed: timeline.completed
              });
            }
          } catch (error) {
            this.io.to(roomCode).emit("realtime:error", {
              code: "TIMELINE_UNAVAILABLE",
              message: error instanceof Error ? error.message : "Unable to load room timeline"
            });
          }
        })
      );
    } finally {
      this.polling = false;
    }
  }
}
