package com.lucy.lms.service;

import com.lucy.lms.dto.AuthResponseDTO;
import com.lucy.lms.dto.AuthUserDTO;
import com.lucy.lms.dto.ConfirmEmailChangeDTO;
import com.lucy.lms.dto.EmailChangeResponseDTO;
import com.lucy.lms.dto.LoginRequestDTO;
import com.lucy.lms.dto.RegisterRequestDTO;
import com.lucy.lms.dto.RequestEmailChangeDTO;
import com.lucy.lms.dto.UpdateProfileRequestDTO;
import com.lucy.lms.entity.AccountRole;
import com.lucy.lms.entity.AppUser;
import com.lucy.lms.entity.AuthSession;
import com.lucy.lms.entity.EmailChangeToken;
import com.lucy.lms.repository.AppUserRepository;
import com.lucy.lms.repository.AuthSessionRepository;
import com.lucy.lms.repository.EmailChangeTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration ACCESS_TOKEN_TTL = Duration.ofHours(8);
    private static final Duration EMAIL_CHANGE_TOKEN_TTL = Duration.ofMinutes(15);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AppUserRepository appUserRepository;
    private final AuthSessionRepository authSessionRepository;
    private final EmailChangeTokenRepository emailChangeTokenRepository;
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

        if (request.email() != null && !normalizeEmail(request.email()).equalsIgnoreCase(user.getEmail())) {
            throw new BadRequestException("Email is a locked primary field and cannot be updated directly in profile. Please request an email change verification code.");
        }

        // Password change
        if (request.newPassword() != null && !request.newPassword().isBlank()) {
            if (request.currentPassword() == null || request.currentPassword().isBlank()) {
                throw new BadRequestException("Current password is required to set a new password");
            }
            if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                throw new BadRequestException("Current password is incorrect");
            }
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        }

        // Base fields (email remains locked to current user email)
        user.setDisplayName(request.displayName().trim());
        user.setDob(request.dob());
        user.setPhoneNumber(request.phoneNumber());

        // Learner fields
        user.setTargetLanguage(request.targetLanguage());
        user.setNativeLanguage(request.nativeLanguage());
        user.setDailyGoal(request.dailyGoal());

        // Mentor fields
        user.setQualifications(request.qualifications());
        user.setTeachingLanguages(request.teachingLanguages());

        user.setUpdatedAt(Instant.now());
        return toUserDTO(user);
    }

    @Transactional
    public EmailChangeResponseDTO requestEmailChange(String authorizationHeader, RequestEmailChangeDTO request) {
        AppUser user = resolveSession(authorizationHeader).getUser();
        String newEmail = normalizeEmail(request.newEmail());

        if (newEmail.equalsIgnoreCase(user.getEmail())) {
            throw new BadRequestException("Email mới không được trùng với Email hiện tại");
        }

        if (appUserRepository.existsByEmail(newEmail)) {
            throw new BadRequestException("Email này đã được sử dụng bởi tài khoản khác");
        }

        if (request.currentPassword() != null && !request.currentPassword().isBlank()) {
            if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                throw new BadRequestException("Mật khẩu hiện tại không chính xác");
            }
        }

        emailChangeTokenRepository.deleteByUser(user);

        String oldCode = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        String newCode = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        Instant now = Instant.now();
        EmailChangeToken token = EmailChangeToken.builder()
                .user(user)
                .newEmail(newEmail)
                .oldEmailVerificationCode(oldCode)
                .newEmailVerificationCode(newCode)
                .createdAt(now)
                .expiresAt(now.plus(EMAIL_CHANGE_TOKEN_TTL))
                .build();

        emailChangeTokenRepository.save(token);
        log.info("DISPATCHING VERIFICATION CODES - Old Email ({}) code: [{}], New Email ({}) code: [{}]", user.getEmail(), oldCode, newEmail, newCode);

        return new EmailChangeResponseDTO(
                "Mã xác nhận đã được gửi đến cả Email hiện tại và Email mới.",
                newEmail
        );
    }

    @Transactional
    public AuthUserDTO confirmEmailChange(String authorizationHeader, ConfirmEmailChangeDTO request) {
        AppUser user = resolveSession(authorizationHeader).getUser();
        String newEmail = normalizeEmail(request.newEmail());
        String oldCode = request.oldEmailCode() != null ? request.oldEmailCode().trim() : "";
        String newCode = request.newEmailCode() != null ? request.newEmailCode().trim() : "";

        Instant now = Instant.now();
        EmailChangeToken token = emailChangeTokenRepository
                .findTopByUserAndNewEmailAndOldEmailVerificationCodeAndNewEmailVerificationCodeAndExpiresAtAfter(
                        user, newEmail, oldCode, newCode, now
                )
                .orElseThrow(() -> new BadRequestException("Mã xác nhận Email cũ hoặc Email mới không chính xác hoặc đã hết hạn"));

        if (appUserRepository.existsByEmail(newEmail)) {
            throw new BadRequestException("Email này đã được đăng ký bởi tài khoản khác");
        }

        user.setEmail(newEmail);
        user.setUpdatedAt(now);
        appUserRepository.save(user);

        emailChangeTokenRepository.deleteByUser(user);
        log.info("Email updated successfully for user ID {}: new email is {}", user.getId(), newEmail);

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
                Boolean.TRUE.equals(user.getAnonymous()),
                user.getDob(),
                user.getPhoneNumber(),
                user.getTargetLanguage(),
                user.getNativeLanguage(),
                user.getDailyGoal(),
                user.getQualifications(),
                user.getTeachingLanguages()
        );
    }

    @Transactional(readOnly = true)
    public java.util.List<AuthUserDTO> listAllUsers(String authorizationHeader) {
        AppUser requester = resolveSession(authorizationHeader).getUser();
        if (requester.getRole() != AccountRole.LUCY_SUPER) {
            throw new UnauthorizedException("Only LUCY_SUPER admin accounts can view user list");
        }
        return appUserRepository.findAll().stream()
                .map(this::toUserDTO)
                .toList();
    }

    @Transactional
    public AuthUserDTO updateUserRole(String authorizationHeader, Long userId, AccountRole newRole) {
        AppUser requester = resolveSession(authorizationHeader).getUser();
        if (requester.getRole() != AccountRole.LUCY_SUPER) {
            throw new UnauthorizedException("Only LUCY_SUPER admin accounts can update user roles");
        }
        AppUser targetUser = appUserRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found with id: " + userId));
        targetUser.setRole(newRole);
        targetUser.setAnonymous(newRole == AccountRole.LUCY);
        targetUser.setUpdatedAt(Instant.now());
        appUserRepository.save(targetUser);
        return toUserDTO(targetUser);
    }

    @Transactional
    public void deleteUser(String authorizationHeader, Long userId) {
        AppUser requester = resolveSession(authorizationHeader).getUser();
        if (requester.getRole() != AccountRole.LUCY_SUPER) {
            throw new UnauthorizedException("Only LUCY_SUPER admin accounts can delete users");
        }
        if (requester.getId().equals(userId)) {
            throw new BadRequestException("You cannot delete your own admin account");
        }
        AppUser targetUser = appUserRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found with id: " + userId));

        authSessionRepository.deleteByUser(targetUser);
        appUserRepository.delete(targetUser);
    }

    @Transactional
    public AuthUserDTO toggleUserStatus(String authorizationHeader, Long userId, boolean enabled) {
        AppUser requester = resolveSession(authorizationHeader).getUser();
        if (requester.getRole() != AccountRole.LUCY_SUPER) {
            throw new UnauthorizedException("Only LUCY_SUPER admin accounts can lock/unlock users");
        }
        if (requester.getId().equals(userId)) {
            throw new BadRequestException("You cannot lock your own admin account");
        }
        AppUser targetUser = appUserRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found with id: " + userId));

        targetUser.setEnabled(enabled);
        targetUser.setUpdatedAt(Instant.now());
        appUserRepository.save(targetUser);
        return toUserDTO(targetUser);
    }

    @Transactional
    public AuthUserDTO resetUserPassword(String authorizationHeader, Long userId, String newPassword) {
        AppUser requester = resolveSession(authorizationHeader).getUser();
        if (requester.getRole() != AccountRole.LUCY_SUPER) {
            throw new UnauthorizedException("Only LUCY_SUPER admin accounts can reset user passwords");
        }
        if (newPassword == null || newPassword.isBlank() || newPassword.length() < 6) {
            throw new BadRequestException("New password must be at least 6 characters");
        }
        AppUser targetUser = appUserRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found with id: " + userId));

        targetUser.setPasswordHash(passwordEncoder.encode(newPassword));
        targetUser.setUpdatedAt(Instant.now());
        appUserRepository.save(targetUser);
        return toUserDTO(targetUser);
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
