package com.lucy.lms.dto;

import java.time.Instant;

public record PinnedMaterialDTO(
        Long id,
        String title,
        String materialType,
        String resourceUrl,
        String description,
        Integer pinnedOrder,
        Instant pinnedAt
) {
}
