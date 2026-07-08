package com.lucy.lms.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record CreateLiveRoomRequestDTO(
        @NotBlank
        String languageCode,

        @NotNull
        @Min(1)
        @Max(100)
        Integer levelNumber,

        String displayName,

        Instant startedAt
) {
}
