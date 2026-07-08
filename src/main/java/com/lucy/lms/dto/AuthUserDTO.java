package com.lucy.lms.dto;

import com.lucy.lms.entity.AccountRole;

public record AuthUserDTO(
        Long id,
        String email,
        String displayName,
        AccountRole role,
        String personaId,
        boolean anonymous
) {
}
