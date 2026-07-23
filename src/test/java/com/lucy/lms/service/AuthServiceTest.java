package com.lucy.lms.service;

import com.lucy.lms.dto.AuthUserDTO;
import com.lucy.lms.dto.LearnerLevelProgressRequestDTO;
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

        AuthUserDTO updated = authService.updateProfile(
                "Bearer test-token",
                new UpdateProfileRequestDTO(
                        "  OLD@Example.com ",
                        "  New Name  ",
                        "  +84 900 000 001  ",
                        "  English, Japanese  ",
                        "Ignored teaching languages",
                        "Ignored certificates",
                        "Ignored achievements",
                        "Ignored brand",
                        "https://facebook.com/ignored",
                        "https://youtube.com/ignored",
                        "Ignored bio"
                )
        );

        assertEquals("old@example.com", updated.email());
        assertEquals("New Name", updated.displayName());
        assertEquals("+84 900 000 001", updated.phoneNumber());
        assertEquals("English, Japanese", updated.learningLanguages());
        assertEquals(null, updated.teachingLanguages());
        assertEquals(null, updated.brandName());
        assertEquals("Ignored bio", updated.bio());
        assertEquals("old@example.com", user.getEmail());
        assertEquals("New Name", user.getDisplayName());
        assertEquals("+84 900 000 001", user.getPhoneNumber());
        assertEquals("English, Japanese", user.getLearningLanguages());
    }

    @Test
    void updateProfileRejectsEmailChanges() {
        AppUser user = user(1L, "owner@example.com", "Owner");
        authenticate(user);

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> authService.updateProfile(
                        "Bearer test-token",
                        new UpdateProfileRequestDTO(
                                "taken@example.com",
                                "Owner",
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null
                        )
                )
        );

        assertEquals("Email cannot be changed", exception.getMessage());
        assertEquals("owner@example.com", user.getEmail());
    }

    @Test
    void updateProfilePersistsProCertificateFields() {
        AppUser user = user(1L, "pro@example.com", "Pro Mentor", AccountRole.LUCY_PRO);
        authenticate(user);

        AuthUserDTO updated = authService.updateProfile(
                "Bearer test-token",
                new UpdateProfileRequestDTO(
                        "pro@example.com",
                        "Pro Mentor",
                        "+84 900 000 002",
                        "Ignored learning languages",
                        "English, Chinese",
                        "TESOL, IELTS 8.0",
                        "10,000 learner minutes",
                        "Ignored brand",
                        "https://facebook.com/ignored",
                        "https://youtube.com/ignored",
                        "Ignored bio"
                )
        );

        assertEquals("+84 900 000 002", updated.phoneNumber());
        assertEquals(null, updated.learningLanguages());
        assertEquals("English, Chinese", updated.teachingLanguages());
        assertEquals("TESOL, IELTS 8.0", updated.certificates());
        assertEquals("10,000 learner minutes", updated.achievements());
        assertEquals(null, updated.brandName());
        assertEquals("Ignored bio", updated.bio());
    }

    @Test
    void updateProfilePersistsSuperBrandFields() {
        AppUser user = user(1L, "super@example.com", "Super Creator", AccountRole.LUCY_SUPER);
        authenticate(user);

        AuthUserDTO updated = authService.updateProfile(
                "Bearer test-token",
                new UpdateProfileRequestDTO(
                        "super@example.com",
                        "Super Creator",
                        "+84 900 000 003",
                        "Ignored learning languages",
                        "Japanese, English",
                        "Ignored certificates",
                        "Ignored achievements",
                        "Lucy Speaking Lab",
                        "https://facebook.com/lucyspeakinglab",
                        "https://youtube.com/@lucyspeakinglab",
                        "Short creator bio."
                )
        );

        assertEquals("+84 900 000 003", updated.phoneNumber());
        assertEquals(null, updated.learningLanguages());
        assertEquals("Japanese, English", updated.teachingLanguages());
        assertEquals(null, updated.certificates());
        assertEquals(null, updated.achievements());
        assertEquals("Lucy Speaking Lab", updated.brandName());
        assertEquals("https://facebook.com/lucyspeakinglab", updated.facebookUrl());
        assertEquals("https://youtube.com/@lucyspeakinglab", updated.youtubeUrl());
        assertEquals("Short creator bio.", updated.bio());
    }

    @Test
    void advanceLearnerLevelAfterTenMinutesInCurrentLevelRoom() {
        AppUser user = user(1L, "learner@example.com", "Learner");
        user.setLearnerEnglishLevel(3);
        when(appUserRepository.findByPersonaId("persona_1")).thenReturn(Optional.of(user));

        AuthUserDTO updated = authService.advanceLearnerLevel(
                "persona_1",
                new LearnerLevelProgressRequestDTO("EN", 3, 10)
        );

        assertEquals(4, updated.learnerEnglishLevel());
        assertEquals(4, user.getLearnerEnglishLevel());
    }

    @Test
    void advanceLearnerLevelDoesNotSkipWhenRoomIsNotCurrentLevel() {
        AppUser user = user(1L, "learner@example.com", "Learner");
        user.setLearnerEnglishLevel(3);
        when(appUserRepository.findByPersonaId("persona_1")).thenReturn(Optional.of(user));

        AuthUserDTO updated = authService.advanceLearnerLevel(
                "persona_1",
                new LearnerLevelProgressRequestDTO("EN", 2, 10)
        );

        assertEquals(3, updated.learnerEnglishLevel());
        assertEquals(3, user.getLearnerEnglishLevel());
    }

    private void authenticate(AppUser user) {
        when(authSessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(anyString(), any(Instant.class)))
                .thenReturn(Optional.of(AuthSession.builder().user(user).build()));
    }

    private AppUser user(Long id, String email, String displayName) {
        return user(id, email, displayName, AccountRole.LUCY);
    }

    private AppUser user(Long id, String email, String displayName, AccountRole role) {
        Instant now = Instant.parse("2026-07-08T00:00:00Z");
        return AppUser.builder()
                .id(id)
                .email(email)
                .displayName(displayName)
                .passwordHash("hash")
                .role(role)
                .personaId("persona_" + id)
                .anonymous(role == AccountRole.LUCY)
                .enabled(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }
}
