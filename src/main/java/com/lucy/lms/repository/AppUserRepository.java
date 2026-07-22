package com.lucy.lms.repository;

import com.lucy.lms.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    boolean existsByEmail(String email);

    boolean existsByPersonaId(String personaId);

    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findByPersonaId(String personaId);
}
