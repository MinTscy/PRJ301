package com.lucy.lms.service;

import com.lucy.lms.dto.AuthResponseDTO;
import com.lucy.lms.dto.AuthUserDTO;
import com.lucy.lms.dto.LoginRequestDTO;
import com.lucy.lms.dto.RegisterRequestDTO;
import com.lucy.lms.dto.UpdateProfileRequestDTO;
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
        return createSession(user, now);
    }

    @Transactional(readOnly = true)
    public AuthUserDTO me(String authorizationHeader) {
        return toUserDTO(resolveSession(authorizationHeader).getUser());
    }

    @Transactional
    public AuthUserDTO updateProfile(String authorizationHeader, UpdateProfileRequestDTO request) {
        AppUser user = resolveSession(authorizationHeader).getUser();
        String email = normalizeEmail(request.email());

        appUserRepository.findByEmail(email)
                .filter(existingUser -> !existingUser.getId().equals(user.getId()))
                .ifPresent(existingUser -> {
                    throw new BadRequestException("Email is already registered");
                });

        user.setEmail(email);
        user.setDisplayName(request.displayName().trim());
        user.setUpdatedAt(Instant.now());
        return toUserDTO(user);
    }

    @Transactional(readOnly = true)
    public AuthUserDTO findByPersonaId(String personaId) {
        return toUserDTO(appUserRepository.findByPersonaId(personaId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with persona id: " + personaId)));
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
                user.getRole(),
                user.getPersonaId(),
                Boolean.TRUE.equals(user.getAnonymous())
        );
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
