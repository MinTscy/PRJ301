package com.lucy.lms.dto;

import java.util.List;

public record StageCoverageDTO(
        Integer stageNumber,
        Integer expectedStartLevel,
        Integer expectedEndLevel,
        int expectedLevels,
        int importedLevels,
        int missingLevels,
        boolean stageExists,
        boolean complete,
        List<Integer> missingLevelNumbers
) {
}
