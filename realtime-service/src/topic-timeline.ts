import type { RoomTimeline, TimelineStep } from "./types.js";

export const DEFAULT_TOPIC_DURATION_MINUTES = 10;

export function buildTopicTimeline(
  source: RoomTimeline,
  topicDurationMinutes = DEFAULT_TOPIC_DURATION_MINUTES
): RoomTimeline {
  const duration = normalizeDuration(topicDurationMinutes);
  const elapsedMinutes = Math.max(0, source.elapsedMinutes);
  const steps = source.steps.map((step, index) =>
    toTopicStep(step, index, elapsedMinutes, duration)
  );

  if (steps.length === 0) {
    return {
      ...source,
      currentStep: null,
      nextStep: null,
      completed: source.completed,
      steps
    };
  }

  const currentIndex = Math.floor(elapsedMinutes / duration);
  const completed = currentIndex >= steps.length;
  const currentStep = completed ? null : steps[currentIndex] ?? null;
  const nextStep = completed ? null : steps[currentIndex + 1] ?? null;

  return {
    ...source,
    completed,
    currentStep,
    nextStep,
    steps
  };
}

function toTopicStep(
  step: TimelineStep,
  index: number,
  elapsedMinutes: number,
  durationMinutes: number
): TimelineStep {
  const startMinute = index * durationMinutes;
  const endMinute = startMinute + durationMinutes;

  return {
    ...step,
    durationMinutes,
    startMinute,
    endMinute,
    current: elapsedMinutes >= startMinute && elapsedMinutes < endMinute
  };
}

function normalizeDuration(durationMinutes: number): number {
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
    return DEFAULT_TOPIC_DURATION_MINUTES;
  }
  return durationMinutes;
}
