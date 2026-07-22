package com.lucy.lms.repository;

import com.lucy.lms.entity.AppUser;
import com.lucy.lms.entity.EmailChangeToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface EmailChangeTokenRepository extends JpaRepository<EmailChangeToken, Long> {

    Optional<EmailChangeToken> findTopByUserAndNewEmailAndOldEmailVerificationCodeAndNewEmailVerificationCodeAndExpiresAtAfter(
            AppUser user,
            String newEmail,
            String oldEmailVerificationCode,
            String newEmailVerificationCode,
            Instant now
    );

    void deleteByUser(AppUser user);
}
