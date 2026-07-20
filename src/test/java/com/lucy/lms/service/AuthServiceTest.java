package com.lucy.lms.service;

import com.lucy.lms.dto.AuthUserDTO;
import com.lucy.lms.dto.UpdateProfileRequestDTO;
import com.lucy.lms.entity.AccountRole;
import com.lucy.lms.entity.AppUser;
import com.lucy.lms.entity.AuthSession;
import com.lucy.lms.repository.AppUserRepository;
import com.lucy.lms.repository.AuthSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AppUserRepository appUserRepository;

    @Mock
    private AuthSessionRepository authSessionRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    @Test
    void updateProfileNormalizesAndPersistsEditableFields() {
        AppUser user = user(1L, "old@example.com", "Old Name");
        authenticate(user);
        when(appUserRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());

        AuthUserDTO updated = authService.updateProfile(
                "Bearer test-token",
                new UpdateProfileRequestDTO("  NEW@Example.com ", "  New Name  ", null, null, null, null, null, null, null, null, null)
        );

        assertEquals("new@example.com", updated.email());
        assertEquals("New Name", updated.displayName());
        assertEquals("new@example.com", user.getEmail());
        assertEquals("New Name", user.getDisplayName());
    }

    @Test
    void updateProfileRejectsEmailOwnedByAnotherUser() {
        AppUser user = user(1L, "owner@example.com", "Owner");
        AppUser anotherUser = user(2L, "taken@example.com", "Another User");
        authenticate(user);
        when(appUserRepository.findByEmail("taken@example.com")).thenReturn(Optional.of(anotherUser));

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> authService.updateProfile(
                        "Bearer test-token",
                        new UpdateProfileRequestDTO("taken@example.com", "Owner", null, null, null, null, null, null, null, null, null)
                )
        );

        assertEquals("Email is already registered", exception.getMessage());
        assertEquals("owner@example.com", user.getEmail());
    }

    private void authenticate(AppUser user) {
        when(authSessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(anyString(), any(Instant.class)))
                .thenReturn(Optional.of(AuthSession.builder().user(user).build()));
    }

    private AppUser user(Long id, String email, String displayName) {
        Instant now = Instant.parse("2026-07-08T00:00:00Z");
        return AppUser.builder()
                .id(id)
                .email(email)
                .displayName(displayName)
                .passwordHash("hash")
                .role(AccountRole.LUCY)
                .personaId("persona_" + id)
                .anonymous(true)
                .enabled(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }
}
