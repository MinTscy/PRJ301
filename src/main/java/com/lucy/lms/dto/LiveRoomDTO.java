package com.lucy.lms.dto;

import java.time.Instant;

public record LiveRoomDTO(
        Long id,
        String roomCode,
        String displayName,
        String status,
        Boolean anonymousMode,
        Instant startedAt,
        Long levelId,
        Integer levelNumber,
        String levelTitle,
        Integer stageNumber,
        String languageCode
) {
}
