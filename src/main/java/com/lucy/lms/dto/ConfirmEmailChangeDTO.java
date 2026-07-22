package com.lucy.lms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConfirmEmailChangeDTO(
        @NotBlank @Email @Size(max = 180) String newEmail,
        @NotBlank @Size(min = 6, max = 6) String oldEmailCode,
        @NotBlank @Size(min = 6, max = 6) String newEmailCode
) {
}
