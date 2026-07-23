package com.lucy.lms.entity;

import org.hibernate.annotations.Check;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AppUserSchemaConstraintTest {

    @Test
    void appUserDeclaresProfileDatabaseConstraints() {
        Set<String> checkNames = Arrays.stream(AppUser.class.getAnnotationsByType(Check.class))
                .map(Check::name)
                .collect(Collectors.toSet());

        assertTrue(checkNames.contains("chk_app_users_identity_not_blank"));
        assertTrue(checkNames.contains("chk_app_users_phone_format"));
        assertTrue(checkNames.contains("chk_app_users_facebook_url"));
        assertTrue(checkNames.contains("chk_app_users_youtube_url"));
        assertTrue(checkNames.contains("chk_app_users_anonymous_matches_role"));
        assertTrue(checkNames.contains("chk_app_users_profile_role_shape"));
        assertTrue(checkNames.contains("chk_app_users_learner_levels_range"));
        assertTrue(checkNames.contains("chk_app_users_learner_levels_role_shape"));
    }
}
