package com.lucy.lms.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record PinMaterialRequestDTO(
        @NotBlank
        String title,

        @NotBlank
        String materialType,

        @NotBlank
        String resourceUrl,

        String description,

        @Min(1)
        Integer pinnedOrder
) {
}
