package com.lucy.lms.dto;

public record SystemAnalyticsDTO(
        long totalUsers,
        long totalLearners,
        long totalMentors,
        long totalSupers,
        long totalLanguages,
        long totalStages,
        long totalLevels,
        long activeRoomsCount
) {
}
