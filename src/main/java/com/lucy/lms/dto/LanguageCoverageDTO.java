package com.lucy.lms.dto;

import java.util.List;

public record LanguageCoverageDTO(
        String languageCode,
        String languageName,
        int totalExpectedLevels,
        int importedLevels,
        int missingLevels,
        boolean complete,
        List<StageCoverageDTO> stages
) {
}
