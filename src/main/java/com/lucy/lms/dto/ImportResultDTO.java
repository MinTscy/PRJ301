package com.lucy.lms.dto;

public record ImportResultDTO(
        String fileName,
        String languageCode,
        Integer stageNumber,
        String levelRange,
        int importedLevels,
        int importedSubLevels,
        int importedContents,
        int importedQuestions,
        String status,
        String message
) {
}
