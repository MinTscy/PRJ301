package com.lucy.lms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequestEmailChangeDTO(
        @NotBlank @Email @Size(max = 180) String newEmail,
        String currentPassword
) {
}
