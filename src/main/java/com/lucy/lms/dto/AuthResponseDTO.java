package com.lucy.lms.dto;

public record AuthResponseDTO(
        String accessToken,
        long expiresInSeconds,
        AuthUserDTO user
) {
}
