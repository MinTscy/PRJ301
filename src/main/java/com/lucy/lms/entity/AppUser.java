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

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "app_users")
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

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    @Column(nullable = false, length = 120)
    private String displayName;

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

    // ── Common optional fields ──────────────────────────────────────────
    @Column
    private LocalDate dob;

    @Column(length = 20)
    private String phoneNumber;

    // ── Learner (LUCY) specific fields ──────────────────────────────────
    @Column(length = 60)
    private String targetLanguage;

    @Column(length = 60)
    private String nativeLanguage;

    @Column(length = 60)
    private String dailyGoal;

    // ── Mentor (LUCY_PRO) specific fields ───────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String qualifications;

    @Column(length = 255)
    private String teachingLanguages;

    @JsonIgnore
    @ToString.Exclude
    @Builder.Default
    @OneToMany(mappedBy = "user")
    private List<AuthSession> sessions = new ArrayList<>();
}
