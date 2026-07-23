package com.lucy.lms.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LearnerLevelProgressRequestDTO(
        @NotBlank String languageCode,
        @NotNull @Min(1) @Max(100) Integer completedLevelNumber,
        @NotNull @Min(1) @Max(1440) Integer minutesInRoom
) {
}
