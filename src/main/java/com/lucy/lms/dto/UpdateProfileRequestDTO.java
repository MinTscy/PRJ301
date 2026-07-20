package com.lucy.lms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateProfileRequestDTO(
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Size(max = 120) String displayName,
        LocalDate dob,
        @Size(max = 20) String phoneNumber,
        // Learner fields
        @Size(max = 60) String targetLanguage,
        @Size(max = 60) String nativeLanguage,
        @Size(max = 60) String dailyGoal,
        // Mentor fields
        String qualifications,
        @Size(max = 255) String teachingLanguages,
        // Password change
        String currentPassword,
        @Size(min = 8, max = 100) String newPassword
) {
}
