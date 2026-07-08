package com.lucy.lms.dto;

public record RoomTimelineStepDTO(
        Long subLevelId,
        Integer subOrder,
        String title,
        Integer durationMinutes,
        int startMinute,
        int endMinute,
        boolean current
) {
}
