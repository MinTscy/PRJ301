package com.lucy.lms.repository;

import com.lucy.lms.entity.AppUser;
import com.lucy.lms.entity.AuthSession;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<AuthSession> findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(String tokenHash, Instant now);

    List<AuthSession> findByUser(AppUser user);

    void deleteByUser(AppUser user);
}
