import assert from "node:assert/strict";
import test from "node:test";
import { buildTopicTimeline } from "./topic-timeline.js";
import type { RoomTimeline, TimelineStep } from "./types.js";

function timeline(elapsedMinutes: number, topicCount = 3): RoomTimeline {
  const steps: TimelineStep[] = Array.from({ length: topicCount }, (_, index) => ({
    subLevelId: index + 1,
    subOrder: index + 1,
    title: `Topic ${index + 1}`,
    durationMinutes: 15,
    startMinute: index * 15,
    endMinute: (index + 1) * 15,
    current: false
  }));

  return {
    roomId: 1,
    roomCode: "LUCY-ROOM",
    levelNumber: 1,
    levelTitle: "Survival Speaking",
    elapsedMinutes,
    completed: false,
    currentStep: null,
    nextStep: null,
    steps
  };
}

test("keeps the first topic active before minute 10", () => {
  const result = buildTopicTimeline(timeline(9));

  assert.equal(result.currentStep?.subOrder, 1);
  assert.equal(result.nextStep?.subOrder, 2);
  assert.equal(result.steps[0].durationMinutes, 10);
  assert.equal(result.steps[0].startMinute, 0);
  assert.equal(result.steps[0].endMinute, 10);
});

test("moves to the next topic when 10 minutes have elapsed", () => {
  const result = buildTopicTimeline(timeline(10));

  assert.equal(result.currentStep?.subOrder, 2);
  assert.equal(result.nextStep?.subOrder, 3);
  assert.equal(result.steps[0].current, false);
  assert.equal(result.steps[1].current, true);
});

test("marks the timeline completed after the final 10-minute topic", () => {
  const result = buildTopicTimeline(timeline(30));

  assert.equal(result.currentStep, null);
  assert.equal(result.nextStep, null);
  assert.equal(result.completed, true);
});

test("supports a configured topic duration", () => {
  const result = buildTopicTimeline(timeline(5), 5);

  assert.equal(result.currentStep?.subOrder, 2);
  assert.equal(result.steps[1].startMinute, 5);
  assert.equal(result.steps[1].endMinute, 10);
});
