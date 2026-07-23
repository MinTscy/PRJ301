package com.lucy.lms.service;

import com.lucy.lms.dto.AuthResponseDTO;
import com.lucy.lms.dto.AuthUserDTO;
import com.lucy.lms.dto.LoginRequestDTO;
import com.lucy.lms.dto.LearnerLevelProgressRequestDTO;
import com.lucy.lms.dto.RegisterRequestDTO;
import com.lucy.lms.dto.UpdateProfileRequestDTO;
import com.lucy.lms.entity.AccountRole;
import com.lucy.lms.entity.AppUser;
import com.lucy.lms.entity.AuthSession;
import com.lucy.lms.repository.AppUserRepository;
import com.lucy.lms.repository.AuthSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration ACCESS_TOKEN_TTL = Duration.ofHours(8);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int MINUTES_REQUIRED_FOR_LEVEL_UP = 10;
    private static final int MIN_LEARNER_LEVEL = 1;
    private static final int MAX_LEARNER_LEVEL = 100;

    private final AppUserRepository appUserRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponseDTO register(RegisterRequestDTO request) {
        String email = normalizeEmail(request.email());
        if (appUserRepository.existsByEmail(email)) {
            throw new BadRequestException("Email is already registered");
        }

        Instant now = Instant.now();
        AppUser user = appUserRepository.save(AppUser.builder()
                .email(email)
                .displayName(request.displayName().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(request.role())
                .personaId(generatePersonaId())
                .anonymous(request.role().name().equals("LUCY"))
                .learnerEnglishLevel(initialLearnerLevel(request, "EN"))
                .learnerJapaneseLevel(initialLearnerLevel(request, "JA"))
                .learnerChineseLevel(initialLearnerLevel(request, "ZH"))
                .enabled(true)
                .createdAt(now)
                .updatedAt(now)
                .build());

        return createSession(user, now);
    }

    @Transactional
    public AuthResponseDTO login(LoginRequestDTO request) {
        AppUser user = appUserRepository.findByEmail(normalizeEmail(request.email()))
                .filter(AppUser::getEnabled)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        Instant now = Instant.now();
        user.setLastLoginAt(now);
        user.setUpdatedAt(now);
        appUserRepository.saveAndFlush(user);
        return createSession(user, now);
    }

    @Transactional(readOnly = true)
    public AuthUserDTO me(String authorizationHeader) {
        return toUserDTO(resolveSession(authorizationHeader).getUser());
    }

    @Transactional
    public AuthUserDTO updateProfile(String authorizationHeader, UpdateProfileRequestDTO request) {
        AppUser user = resolveSession(authorizationHeader).getUser();

        if (request.email() != null && !request.email().isBlank()) {
            String requestedEmail = normalizeEmail(request.email());
            if (!requestedEmail.equals(user.getEmail())) {
                throw new BadRequestException("Email cannot be changed");
            }
        }

        user.setDisplayName(request.displayName().trim());
        applyRoleProfileFields(user, request);
        user.setUpdatedAt(Instant.now());
        return toUserDTO(user);
    }

    @Transactional(readOnly = true)
    public AuthUserDTO findByPersonaId(String personaId) {
        return toUserDTO(appUserRepository.findByPersonaId(personaId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with persona id: " + personaId)));
    }

    @Transactional
    public AuthUserDTO advanceLearnerLevel(String personaId, LearnerLevelProgressRequestDTO request) {
        AppUser user = appUserRepository.findByPersonaId(personaId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with persona id: " + personaId));
        if (user.getRole() != AccountRole.LUCY) {
            throw new BadRequestException("Only learner accounts can advance learner levels.");
        }
        if (request.minutesInRoom() < MINUTES_REQUIRED_FOR_LEVEL_UP) {
            throw new BadRequestException("Learner must stay in the current-level room for at least 10 minutes.");
        }

        String languageCode = normalizeLanguageCode(request.languageCode());
        int currentLevel = learnerLevel(user, languageCode);
        if (currentLevel == request.completedLevelNumber() && currentLevel < MAX_LEARNER_LEVEL) {
            setLearnerLevel(user, languageCode, currentLevel + 1);
            user.setUpdatedAt(Instant.now());
        }

        return toUserDTO(user);
    }

    @Transactional
    public void logout(String authorizationHeader) {
        AuthSession session = resolveSession(authorizationHeader);
        session.setRevokedAt(Instant.now());
    }

    private AuthResponseDTO createSession(AppUser user, Instant now) {
        String token = generateToken();
        AuthSession session = AuthSession.builder()
                .tokenHash(hashToken(token))
                .user(user)
                .issuedAt(now)
                .expiresAt(now.plus(ACCESS_TOKEN_TTL))
                .build();
        authSessionRepository.save(session);

        return new AuthResponseDTO(token, ACCESS_TOKEN_TTL.toSeconds(), toUserDTO(user));
    }

    private AuthSession resolveSession(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        return authSessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(hashToken(token), Instant.now())
                .orElseThrow(() -> new UnauthorizedException("Missing, expired, or invalid access token"));
    }

    private AuthUserDTO toUserDTO(AppUser user) {
        return new AuthUserDTO(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                user.getLearningLanguages(),
                user.getTeachingLanguages(),
                user.getCertificates(),
                user.getAchievements(),
                user.getBrandName(),
                user.getFacebookUrl(),
                user.getYoutubeUrl(),
                user.getBio(),
                learnerLevelOrNull(user, "EN"),
                learnerLevelOrNull(user, "JA"),
                learnerLevelOrNull(user, "ZH"),
                user.getRole(),
                user.getPersonaId(),
                Boolean.TRUE.equals(user.getAnonymous())
        );
    }

    private void applyRoleProfileFields(AppUser user, UpdateProfileRequestDTO request) {
        user.setPhoneNumber(cleanOptional(request.phoneNumber()));

        if (user.getRole() == AccountRole.LUCY) {
            normalizeLearnerLevels(user);
            user.setLearningLanguages(cleanOptional(request.learningLanguages()));
            user.setTeachingLanguages(null);
            user.setCertificates(null);
            user.setAchievements(null);
            user.setBrandName(null);
            user.setFacebookUrl(null);
            user.setYoutubeUrl(null);
            user.setBio(cleanOptional(request.bio()));
            return;
        }

        user.setLearningLanguages(null);
        user.setLearnerEnglishLevel(null);
        user.setLearnerJapaneseLevel(null);
        user.setLearnerChineseLevel(null);
        user.setTeachingLanguages(cleanOptional(request.teachingLanguages()));

        if (user.getRole() == AccountRole.LUCY_PRO) {
            user.setCertificates(cleanOptional(request.certificates()));
            user.setAchievements(cleanOptional(request.achievements()));
            user.setBrandName(null);
            user.setFacebookUrl(null);
            user.setYoutubeUrl(null);
            user.setBio(cleanOptional(request.bio()));
            return;
        }

        user.setCertificates(null);
        user.setAchievements(null);
        user.setBrandName(cleanOptional(request.brandName()));
        user.setFacebookUrl(cleanOptional(request.facebookUrl()));
        user.setYoutubeUrl(cleanOptional(request.youtubeUrl()));
        user.setBio(cleanOptional(request.bio()));
    }

    private String cleanOptional(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.isBlank() ? null : cleaned;
    }

    private Integer initialLearnerLevel(RegisterRequestDTO request, String languageCode) {
        if (request.role() != AccountRole.LUCY) {
            return null;
        }
        return clampLearnerLevel(switch (languageCode) {
            case "EN" -> request.learnerEnglishLevel();
            case "JA" -> request.learnerJapaneseLevel();
            case "ZH" -> request.learnerChineseLevel();
            default -> null;
        });
    }

    private void normalizeLearnerLevels(AppUser user) {
        user.setLearnerEnglishLevel(clampLearnerLevel(user.getLearnerEnglishLevel()));
        user.setLearnerJapaneseLevel(clampLearnerLevel(user.getLearnerJapaneseLevel()));
        user.setLearnerChineseLevel(clampLearnerLevel(user.getLearnerChineseLevel()));
    }

    private int learnerLevel(AppUser user, String languageCode) {
        if (user.getRole() != AccountRole.LUCY) {
            return 0;
        }
        return clampLearnerLevel(switch (normalizeLanguageCode(languageCode)) {
            case "EN" -> user.getLearnerEnglishLevel();
            case "JA" -> user.getLearnerJapaneseLevel();
            case "ZH" -> user.getLearnerChineseLevel();
            default -> throw new BadRequestException("Unsupported learner language code: " + languageCode);
        });
    }

    private Integer learnerLevelOrNull(AppUser user, String languageCode) {
        if (user.getRole() != AccountRole.LUCY) {
            return null;
        }
        return learnerLevel(user, languageCode);
    }

    private void setLearnerLevel(AppUser user, String languageCode, int level) {
        int normalizedLevel = clampLearnerLevel(level);
        switch (normalizeLanguageCode(languageCode)) {
            case "EN" -> user.setLearnerEnglishLevel(normalizedLevel);
            case "JA" -> user.setLearnerJapaneseLevel(normalizedLevel);
            case "ZH" -> user.setLearnerChineseLevel(normalizedLevel);
            default -> throw new BadRequestException("Unsupported learner language code: " + languageCode);
        }
    }

    private int clampLearnerLevel(Integer level) {
        if (level == null) {
            return MIN_LEARNER_LEVEL;
        }
        return Math.max(MIN_LEARNER_LEVEL, Math.min(MAX_LEARNER_LEVEL, level));
    }

    private String normalizeLanguageCode(String languageCode) {
        String normalized = languageCode.trim().toUpperCase(Locale.ROOT);
        if (!normalized.equals("EN") && !normalized.equals("JA") && !normalized.equals("ZH")) {
            throw new BadRequestException("Unsupported learner language code: " + languageCode);
        }
        return normalized;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Missing Authorization bearer token");
        }
        String token = authorizationHeader.substring("Bearer ".length()).trim();
        if (token.isBlank()) {
            throw new UnauthorizedException("Missing Authorization bearer token");
        }
        return token;
    }

    private String generatePersonaId() {
        return "persona_" + randomUrlSafe(18);
    }

    private String generateToken() {
        return "lucy_" + randomUrlSafe(48);
    }

    private String randomUrlSafe(int bytes) {
        byte[] data = new byte[bytes];
        SECURE_RANDOM.nextBytes(data);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
