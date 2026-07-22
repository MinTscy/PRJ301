package com.lucy.lms.controller;

import com.lucy.lms.dto.AuthResponseDTO;
import com.lucy.lms.dto.AuthUserDTO;
import com.lucy.lms.dto.ConfirmEmailChangeDTO;
import com.lucy.lms.dto.EmailChangeResponseDTO;
import com.lucy.lms.dto.LoginRequestDTO;
import com.lucy.lms.dto.RegisterRequestDTO;
import com.lucy.lms.dto.RequestEmailChangeDTO;
import com.lucy.lms.dto.UpdateProfileRequestDTO;
import com.lucy.lms.entity.AccountRole;
import com.lucy.lms.service.AuthService;
import com.lucy.lms.service.UnauthorizedException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth API", description = "Local login/register contract for LUCY, LUCY_PRO, and LUCY_SUPER accounts.")
public class AuthController {

    private final AuthService authService;

    @Value("${lucy.internal-service-secret}")
    private String internalServiceSecret;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a LUCY account and create an access token")
    public AuthResponseDTO register(@Valid @RequestBody RegisterRequestDTO request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email/password and create an access token")
    public AuthResponseDTO login(@Valid @RequestBody LoginRequestDTO request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile from Authorization bearer token")
    public AuthUserDTO me(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return authService.me(authorizationHeader);
    }

    @PutMapping("/me")
    @Operation(summary = "Update the current user's profile")
    public AuthUserDTO updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody UpdateProfileRequestDTO request
    ) {
        return authService.updateProfile(authorizationHeader, request);
    }

    @PostMapping("/email-change/request")
    @Operation(summary = "Request a 6-digit confirmation code to change user email")
    public EmailChangeResponseDTO requestEmailChange(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody RequestEmailChangeDTO request
    ) {
        return authService.requestEmailChange(authorizationHeader, request);
    }

    @PostMapping("/email-change/confirm")
    @Operation(summary = "Confirm email change with 6-digit verification code")
    public AuthUserDTO confirmEmailChange(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody ConfirmEmailChangeDTO request
    ) {
        return authService.confirmEmailChange(authorizationHeader, request);
    }

    @GetMapping("/internal/personas/{personaId}")
    @Operation(summary = "Resolve an account for an internal service by persona id")
    public AuthUserDTO findByPersonaId(
            @PathVariable String personaId,
            @RequestHeader(value = "X-LUCY-INTERNAL-SECRET", required = false) String internalSecret
    ) {
        if (!internalServiceSecret.equals(internalSecret)) {
            throw new UnauthorizedException("Invalid internal service secret");
        }
        return authService.findByPersonaId(personaId);
    }

    @GetMapping("/admin/users")
    @Operation(summary = "Admin endpoint: List all registered accounts (LUCY_SUPER only)")
    public List<AuthUserDTO> listAllUsers(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        return authService.listAllUsers(authorizationHeader);
    }

    @PutMapping("/admin/users/{userId}/role")
    @Operation(summary = "Admin endpoint: Change role for a target user (LUCY_SUPER only)")
    public AuthUserDTO updateUserRole(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long userId,
            @RequestParam AccountRole role
    ) {
        return authService.updateUserRole(authorizationHeader, userId, role);
    }

    @DeleteMapping("/admin/users/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Admin endpoint: Delete a user account (LUCY_SUPER only)")
    public void deleteUser(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long userId
    ) {
        authService.deleteUser(authorizationHeader, userId);
    }

    @PutMapping("/admin/users/{userId}/status")
    @Operation(summary = "Admin endpoint: Lock or unlock a user account (LUCY_SUPER only)")
    public AuthUserDTO toggleUserStatus(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long userId,
            @RequestParam boolean enabled
    ) {
        return authService.toggleUserStatus(authorizationHeader, userId, enabled);
    }

    @PostMapping("/admin/users/{userId}/reset-password")
    @Operation(summary = "Admin endpoint: Reset password for a target user (LUCY_SUPER only)")
    public AuthUserDTO resetUserPassword(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long userId,
            @RequestParam(defaultValue = "12345678") String newPassword
    ) {
        return authService.resetUserPassword(authorizationHeader, userId, newPassword);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke current access token")
    public void logout(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        authService.logout(authorizationHeader);
    }
}
