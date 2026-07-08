package com.lucy.lms.controller;

import com.lucy.lms.dto.AuthResponseDTO;
import com.lucy.lms.dto.AuthUserDTO;
import com.lucy.lms.dto.LoginRequestDTO;
import com.lucy.lms.dto.RegisterRequestDTO;
import com.lucy.lms.service.AuthService;
import com.lucy.lms.service.UnauthorizedException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

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

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke current access token")
    public void logout(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        authService.logout(authorizationHeader);
    }
}
