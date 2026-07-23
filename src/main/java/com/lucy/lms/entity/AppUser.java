package com.lucy.lms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.Check;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "app_users")
@Check(name = "chk_app_users_identity_not_blank", constraints = "char_length(trim(email)) > 0 and char_length(trim(display_name)) > 0 and char_length(trim(persona_id)) > 0")
@Check(name = "chk_app_users_phone_format", constraints = "phone_number is null or phone_number regexp '^[+0-9][-0-9 .()]{6,39}$'")
@Check(name = "chk_app_users_facebook_url", constraints = "facebook_url is null or facebook_url like 'https://facebook.com/%' or facebook_url like 'https://www.facebook.com/%'")
@Check(name = "chk_app_users_youtube_url", constraints = "youtube_url is null or youtube_url like 'https://youtube.com/%' or youtube_url like 'https://www.youtube.com/%' or youtube_url like 'https://youtu.be/%'")
@Check(name = "chk_app_users_anonymous_matches_role", constraints = "(role = 'LUCY' and anonymous = b'1') or (role <> 'LUCY' and anonymous = b'0')")
@Check(name = "chk_app_users_profile_role_shape", constraints = "(role = 'LUCY' and teaching_languages is null and certificates is null and achievements is null and brand_name is null and facebook_url is null and youtube_url is null) or (role = 'LUCY_PRO' and learning_languages is null and brand_name is null and facebook_url is null and youtube_url is null) or (role = 'LUCY_SUPER' and learning_languages is null and certificates is null and achievements is null)")
@Check(name = "chk_app_users_learner_levels_range", constraints = "(learner_english_level is null or learner_english_level between 1 and 100) and (learner_japanese_level is null or learner_japanese_level between 1 and 100) and (learner_chinese_level is null or learner_chinese_level between 1 and 100)")
@Check(name = "chk_app_users_learner_levels_role_shape", constraints = "role = 'LUCY' or (learner_english_level is null and learner_japanese_level is null and learner_chinese_level is null)")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false, unique = true, updatable = false, length = 180)
    private String email;

    @Column(nullable = false, length = 120)
    private String displayName;

    @Column(name = "phone_number", length = 40)
    private String phoneNumber;

    @Column(name = "learning_languages", length = 240)
    private String learningLanguages;

    @Column(name = "teaching_languages", length = 240)
    private String teachingLanguages;

    @Column(length = 1000)
    private String certificates;

    @Column(length = 1000)
    private String achievements;

    @Column(name = "brand_name", length = 160)
    private String brandName;

    @Column(name = "facebook_url", length = 300)
    private String facebookUrl;

    @Column(name = "youtube_url", length = 300)
    private String youtubeUrl;

    @Column(length = 1200)
    private String bio;

    @Column(name = "learner_english_level")
    private Integer learnerEnglishLevel;

    @Column(name = "learner_japanese_level")
    private Integer learnerJapaneseLevel;

    @Column(name = "learner_chinese_level")
    private Integer learnerChineseLevel;

    @JsonIgnore
    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AccountRole role;

    @Column(nullable = false, unique = true, length = 80)
    private String personaId;

    @Column(nullable = false)
    private Boolean anonymous;

    @Column(nullable = false)
    private Boolean enabled;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Column
    private Instant lastLoginAt;

    @JsonIgnore
    @ToString.Exclude
    @Builder.Default
    @OneToMany(mappedBy = "user")
    private List<AuthSession> sessions = new ArrayList<>();
}
