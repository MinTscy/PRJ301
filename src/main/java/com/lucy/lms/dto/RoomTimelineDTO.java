package com.lucy.lms.dto;

import java.time.Instant;
import java.util.List;

public record RoomTimelineDTO(
        Long roomId,
        String roomCode,
        Integer levelNumber,
        String levelTitle,
        Instant startedAt,
        long elapsedMinutes,
        boolean completed,
        RoomTimelineStepDTO currentStep,
        RoomTimelineStepDTO nextStep,
        List<RoomTimelineStepDTO> steps
) {
}
