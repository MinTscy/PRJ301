package com.lucy.lms.dto;

import com.lucy.lms.entity.AccountRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record RegisterRequestDTO(
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank @Size(max = 120) String displayName,
        @NotNull AccountRole role,
        @Min(1) @Max(100) Integer learnerEnglishLevel,
        @Min(1) @Max(100) Integer learnerJapaneseLevel,
        @Min(1) @Max(100) Integer learnerChineseLevel
) {
}
