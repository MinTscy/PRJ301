package com.lucy.lms.controller;

import com.lucy.lms.dto.SystemAnalyticsDTO;
import com.lucy.lms.entity.AccountRole;
import com.lucy.lms.entity.AppUser;
import com.lucy.lms.repository.AppUserRepository;
import com.lucy.lms.repository.LanguageRepository;
import com.lucy.lms.repository.LevelRepository;
import com.lucy.lms.repository.LiveRoomRepository;
import com.lucy.lms.repository.StageRepository;
import com.lucy.lms.service.AuthService;
import com.lucy.lms.service.UnauthorizedException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin API", description = "System analytics and platform administration endpoints for LUCY_SUPER users.")
public class AdminAnalyticsController {

    private final AuthService authService;
    private final AppUserRepository appUserRepository;
    private final LanguageRepository languageRepository;
    private final StageRepository stageRepository;
    private final LevelRepository levelRepository;
    private final LiveRoomRepository liveRoomRepository;

    @GetMapping("/analytics")
    @Operation(summary = "Get system-wide metrics and stats (LUCY_SUPER only)")
    public SystemAnalyticsDTO getAnalytics(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        var user = authService.me(authorizationHeader);
        if (user.role() != AccountRole.LUCY_SUPER) {
            throw new UnauthorizedException("Only LUCY_SUPER admin accounts can view system analytics");
        }

        List<AppUser> allUsers = appUserRepository.findAll();
        long totalUsers = allUsers.size();
        long totalLearners = allUsers.stream().filter(u -> u.getRole() == AccountRole.LUCY).count();
        long totalMentors = allUsers.stream().filter(u -> u.getRole() == AccountRole.LUCY_PRO).count();
        long totalSupers = allUsers.stream().filter(u -> u.getRole() == AccountRole.LUCY_SUPER).count();

        long totalLanguages = languageRepository.count();
        long totalStages = stageRepository.count();
        long totalLevels = levelRepository.count();
        long activeRoomsCount = liveRoomRepository.findAll().stream()
                .filter(r -> "ACTIVE".equalsIgnoreCase(r.getStatus()))
                .count();

        return new SystemAnalyticsDTO(
                totalUsers,
                totalLearners,
                totalMentors,
                totalSupers,
                totalLanguages,
                totalStages,
                totalLevels,
                activeRoomsCount
        );
    }
}
