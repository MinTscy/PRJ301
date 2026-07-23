package com.lucy.lms.dto;

import com.lucy.lms.entity.AccountRole;

public record AuthUserDTO(
        Long id,
        String email,
        String displayName,
        String phoneNumber,
        String learningLanguages,
        String teachingLanguages,
        String certificates,
        String achievements,
        String brandName,
        String facebookUrl,
        String youtubeUrl,
        String bio,
        Integer learnerEnglishLevel,
        Integer learnerJapaneseLevel,
        Integer learnerChineseLevel,
        AccountRole role,
        String personaId,
        boolean anonymous
) {
}
