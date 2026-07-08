package com.lucy.lms.dto;

public record StageDTO(
        Long id,
        Integer stageNumber,
        String name,
        String description,
        String languageCode,
        String languageName
) {
}
