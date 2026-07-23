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

    private static final String DEFAULT_PASSWORD = "ChangeMe123!";

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
            if (appUserRepository.existsByEmail(seedUser.email())) {
                continue;
            }

            appUserRepository.save(AppUser.builder()
                    .email(seedUser.email())
                    .displayName(seedUser.displayName())
                    .phoneNumber(seedUser.phoneNumber())
                    .learningLanguages(seedUser.learningLanguages())
                    .teachingLanguages(seedUser.teachingLanguages())
                    .certificates(seedUser.certificates())
                    .achievements(seedUser.achievements())
                    .brandName(seedUser.brandName())
                    .facebookUrl(seedUser.facebookUrl())
                    .youtubeUrl(seedUser.youtubeUrl())
                    .bio(seedUser.bio())
                    .learnerEnglishLevel(seedUser.learnerEnglishLevel())
                    .learnerJapaneseLevel(seedUser.learnerJapaneseLevel())
                    .learnerChineseLevel(seedUser.learnerChineseLevel())
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
                        "persona_demo_learner",
                        "+84 900 100 001",
                        "English, Japanese",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        1,
                        1,
                        1,
                        "Learner focused on everyday speaking confidence and structured language practice."
                ),
                new SeedUser(
                        "learner5@lucy.local",
                        "Mina Level 5",
                        AccountRole.LUCY,
                        "persona_demo_learner_level_5",
                        "+84 900 100 005",
                        "English, Japanese, Chinese",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        5,
                        5,
                        5,
                        "Demo learner account with level 5 across English, Japanese, and Chinese."
                ),
                new SeedUser(
                        "learner10@lucy.local",
                        "Noah Level 10",
                        AccountRole.LUCY,
                        "persona_demo_learner_level_10",
                        "+84 900 100 010",
                        "English, Japanese, Chinese",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        10,
                        10,
                        10,
                        "Demo learner account with level 10 across English, Japanese, and Chinese."
                ),
                new SeedUser(
                        "mentor@lucy.local",
                        "Sarah Chen",
                        AccountRole.LUCY_PRO,
                        "persona_demo_pro",
                        "+84 900 100 002",
                        null,
                        "English, Chinese",
                        "TESOL, IELTS 8.0",
                        "Hosted 120 live speaking sessions",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "Mentor profile for pronunciation coaching and live speaking-room moderation."
                ),
                new SeedUser(
                        "creator@lucy.local",
                        "Marcus Webb",
                        AccountRole.LUCY_SUPER,
                        "persona_demo_super",
                        "+84 900 100 003",
                        null,
                        "English, Japanese",
                        null,
                        null,
                        "Lucy Speaking Lab",
                        "https://facebook.com/lucyspeakinglab",
                        "https://youtube.com/@lucyspeakinglab",
                        null,
                        null,
                        null,
                        "Creator profile for brand-led speaking labs and podcast-led learner communities."
                )
        );
    }

    private record SeedUser(
            String email,
            String displayName,
            AccountRole role,
            String personaId,
            String phoneNumber,
            String learningLanguages,
            String teachingLanguages,
            String certificates,
            String achievements,
            String brandName,
            String facebookUrl,
            String youtubeUrl,
            Integer learnerEnglishLevel,
            Integer learnerJapaneseLevel,
            Integer learnerChineseLevel,
            String bio
    ) {
    }
}
