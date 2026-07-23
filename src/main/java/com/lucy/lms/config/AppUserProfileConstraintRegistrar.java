package com.lucy.lms.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AppUserProfileConstraintRegistrar implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    @Override
    public void run(ApplicationArguments args) {
        if (!datasourceUrl.startsWith("jdbc:mysql:")) {
            return;
        }

        profileConstraints().forEach(this::addConstraintIfMissing);
    }

    private void addConstraintIfMissing(ProfileConstraint constraint) {
        Integer existing = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.check_constraints
                        where constraint_schema = database()
                          and constraint_name = ?
                        """,
                Integer.class,
                constraint.name()
        );
        if (existing != null && existing > 0) {
            return;
        }

        jdbcTemplate.execute("alter table app_users add constraint "
                + constraint.name()
                + " check ("
                + constraint.checkClause()
                + ")");
    }

    private List<ProfileConstraint> profileConstraints() {
        return List.of(
                new ProfileConstraint(
                        "chk_app_users_identity_not_blank",
                        "char_length(trim(email)) > 0 and char_length(trim(display_name)) > 0 and char_length(trim(persona_id)) > 0"
                ),
                new ProfileConstraint(
                        "chk_app_users_phone_format",
                        "phone_number is null or phone_number regexp '^[+0-9][-0-9 .()]{6,39}$'"
                ),
                new ProfileConstraint(
                        "chk_app_users_facebook_url",
                        "facebook_url is null or facebook_url like 'https://facebook.com/%' or facebook_url like 'https://www.facebook.com/%'"
                ),
                new ProfileConstraint(
                        "chk_app_users_youtube_url",
                        "youtube_url is null or youtube_url like 'https://youtube.com/%' or youtube_url like 'https://www.youtube.com/%' or youtube_url like 'https://youtu.be/%'"
                ),
                new ProfileConstraint(
                        "chk_app_users_anonymous_matches_role",
                        "(role = 'LUCY' and anonymous = b'1') or (role <> 'LUCY' and anonymous = b'0')"
                ),
                new ProfileConstraint(
                        "chk_app_users_profile_role_shape",
                        "(role = 'LUCY' and teaching_languages is null and certificates is null and achievements is null and brand_name is null and facebook_url is null and youtube_url is null) or (role = 'LUCY_PRO' and learning_languages is null and brand_name is null and facebook_url is null and youtube_url is null) or (role = 'LUCY_SUPER' and learning_languages is null and certificates is null and achievements is null)"
                ),
                new ProfileConstraint(
                        "chk_app_users_learner_levels_range",
                        "(learner_english_level is null or learner_english_level between 1 and 100) and (learner_japanese_level is null or learner_japanese_level between 1 and 100) and (learner_chinese_level is null or learner_chinese_level between 1 and 100)"
                ),
                new ProfileConstraint(
                        "chk_app_users_learner_levels_role_shape",
                        "role = 'LUCY' or (learner_english_level is null and learner_japanese_level is null and learner_chinese_level is null)"
                )
        );
    }

    private record ProfileConstraint(String name, String checkClause) {
    }
}
