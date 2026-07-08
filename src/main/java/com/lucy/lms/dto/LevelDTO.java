package com.lucy.lms.dto;

public record LevelDTO(
        Long id,
        Integer levelNumber,
        String title,
        Integer durationMinutes,
        Integer stageNumber,
        String stageName,
        String languageCode
) {
}
