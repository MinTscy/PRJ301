package com.lucy.lms.dto;

import java.util.List;

public record LevelDetailDTO(
        Long id,
        Integer levelNumber,
        String title,
        Integer durationMinutes,
        StageDTO stage,
        List<SubLevelDTO> subLevels
) {
}
