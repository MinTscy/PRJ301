package com.lucy.lms.dto;

import com.lucy.lms.entity.AccountRole;

import java.time.LocalDate;

public record AuthUserDTO(
        Long id,
        String email,
        String displayName,
        AccountRole role,
        String personaId,
        boolean anonymous,
        LocalDate dob,
        String phoneNumber,
        String targetLanguage,
        String nativeLanguage,
        String dailyGoal,
        String qualifications,
        String teachingLanguages
) {
}
