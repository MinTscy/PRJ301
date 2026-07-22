package com.lucy.lms.service;

import com.lucy.lms.dto.AuthUserDTO;
import com.lucy.lms.dto.ConfirmEmailChangeDTO;
import com.lucy.lms.dto.EmailChangeResponseDTO;
import com.lucy.lms.dto.RequestEmailChangeDTO;
import com.lucy.lms.dto.UpdateProfileRequestDTO;
import com.lucy.lms.entity.AccountRole;
import com.lucy.lms.entity.AppUser;
import com.lucy.lms.entity.AuthSession;
import com.lucy.lms.entity.EmailChangeToken;
import com.lucy.lms.repository.AppUserRepository;
import com.lucy.lms.repository.AuthSessionRepository;
import com.lucy.lms.repository.EmailChangeTokenRepository;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AppUserRepository appUserRepository;

    @Mock
    private AuthSessionRepository authSessionRepository;

    @Mock
    private EmailChangeTokenRepository emailChangeTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    @Test
    void updateProfilePersistsEditableFieldsWhenEmailIsSame() {
        AppUser user = user(1L, "old@example.com", "Old Name");
        authenticate(user);

        AuthUserDTO updated = authService.updateProfile(
                "Bearer test-token",
                new UpdateProfileRequestDTO("old@example.com", "  New Name  ", null, null, null, null, null, null, null, null, null)
        );

        assertEquals("old@example.com", updated.email());
        assertEquals("New Name", updated.displayName());
        assertEquals("New Name", user.getDisplayName());
    }

    @Test
    void updateProfileRejectsDirectEmailModification() {
        AppUser user = user(1L, "owner@example.com", "Owner");
        authenticate(user);

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> authService.updateProfile(
                        "Bearer test-token",
                        new UpdateProfileRequestDTO("different@example.com", "Owner", null, null, null, null, null, null, null, null, null)
                )
        );

        assertEquals("Email is a locked primary field and cannot be updated directly in profile. Please request an email change verification code.", exception.getMessage());
        assertEquals("owner@example.com", user.getEmail());
    }

    @Test
    void requestEmailChangeGeneratesTokenAndDeletesExisting() {
        AppUser user = user(1L, "current@example.com", "Current");
        authenticate(user);
        when(appUserRepository.existsByEmail("new@example.com")).thenReturn(false);

        EmailChangeResponseDTO response = authService.requestEmailChange(
                "Bearer test-token",
                new RequestEmailChangeDTO("new@example.com", null)
        );

        assertEquals("new@example.com", response.newEmail());
        verify(emailChangeTokenRepository).deleteByUser(user);
        verify(emailChangeTokenRepository).save(any(EmailChangeToken.class));
    }

    @Test
    void requestEmailChangeRejectsExistingEmail() {
        AppUser user = user(1L, "current@example.com", "Current");
        authenticate(user);
        when(appUserRepository.existsByEmail("taken@example.com")).thenReturn(true);

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> authService.requestEmailChange(
                        "Bearer test-token",
                        new RequestEmailChangeDTO("taken@example.com", null)
                )
        );

        assertEquals("Email này đã được sử dụng bởi tài khoản khác", exception.getMessage());
    }

    @Test
    void confirmEmailChangeUpdatesUserEmailOnValidDualCodes() {
        AppUser user = user(1L, "old@example.com", "User");
        authenticate(user);
        EmailChangeToken token = EmailChangeToken.builder()
                .id(10L)
                .user(user)
                .newEmail("new@example.com")
                .oldEmailVerificationCode("111111")
                .newEmailVerificationCode("222222")
                .expiresAt(Instant.now().plusSeconds(600))
                .build();

        when(emailChangeTokenRepository.findTopByUserAndNewEmailAndOldEmailVerificationCodeAndNewEmailVerificationCodeAndExpiresAtAfter(
                eq(user), eq("new@example.com"), eq("111111"), eq("222222"), any(Instant.class)
        )).thenReturn(Optional.of(token));
        when(appUserRepository.existsByEmail("new@example.com")).thenReturn(false);

        AuthUserDTO updatedUser = authService.confirmEmailChange(
                "Bearer test-token",
                new ConfirmEmailChangeDTO("new@example.com", "111111", "222222")
        );

        assertEquals("new@example.com", updatedUser.email());
        assertEquals("new@example.com", user.getEmail());
        verify(appUserRepository).save(user);
        verify(emailChangeTokenRepository).deleteByUser(user);
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
