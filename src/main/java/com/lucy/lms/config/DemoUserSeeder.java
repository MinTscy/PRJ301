package com.lucy.lms.config;

import com.lucy.lms.entity.AccountRole;
import com.lucy.lms.entity.AppUser;
import com.lucy.lms.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DemoUserSeeder implements ApplicationRunner {

    private static final String DEFAULT_PASSWORD = "12345678";

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${lucy.seed.demo-users.enabled:true}")
    private boolean enabled;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }

        Instant now = Instant.now();
        for (SeedUser seedUser : seedUsers()) {
            if (appUserRepository.existsByEmail(seedUser.email()) || appUserRepository.existsByPersonaId(seedUser.personaId())) {
                continue;
            }

            appUserRepository.save(AppUser.builder()
                    .email(seedUser.email())
                    .displayName(seedUser.displayName())
                    .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                    .role(seedUser.role())
                    .personaId(seedUser.personaId())
                    .anonymous(seedUser.role() == AccountRole.LUCY)
                    .enabled(true)
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        }
    }

    private List<SeedUser> seedUsers() {
        return List.of(
                new SeedUser(
                        "learner@lucy.local",
                        "Alex Kim",
                        AccountRole.LUCY,
                        "persona_demo_learner"
                ),
                new SeedUser(
                        "mentor@lucy.local",
                        "Sarah Chen",
                        AccountRole.LUCY_PRO,
                        "persona_demo_pro"
                ),
                new SeedUser(
                        "creator@lucy.local",
                        "Marcus Webb",
                        AccountRole.LUCY_SUPER,
                        "persona_demo_super"
                )
        );
    }

    private record SeedUser(
            String email,
            String displayName,
            AccountRole role,
            String personaId
    ) {
    }
}
