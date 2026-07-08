package com.lucy.lms.service;

import com.lucy.lms.dto.RoomTimelineDTO;
import com.lucy.lms.dto.RoomTimelineStepDTO;
import com.lucy.lms.entity.LiveRoom;
import com.lucy.lms.entity.Level;
import com.lucy.lms.entity.SubLevel;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
public class RoomTimelineCalculator {

    public RoomTimelineDTO calculate(LiveRoom room, List<SubLevel> subLevels, Instant now) {
        long elapsedMinutes = Math.max(0, Duration.between(room.getStartedAt(), now).toMinutes());
        List<RoomTimelineStepDTO> steps = new ArrayList<>();
        RoomTimelineStepDTO currentStep = null;
        RoomTimelineStepDTO nextStep = null;
        int cursor = 0;

        for (SubLevel subLevel : subLevels) {
            int duration = safeDuration(subLevel.getDurationMinutes());
            int startMinute = cursor;
            int endMinute = cursor + duration;
            boolean current = elapsedMinutes >= startMinute && elapsedMinutes < endMinute;

            RoomTimelineStepDTO step = new RoomTimelineStepDTO(
                    subLevel.getId(),
                    subLevel.getSubOrder(),
                    subLevel.getTitle(),
                    duration,
                    startMinute,
                    endMinute,
                    current
            );
            steps.add(step);

            if (currentStep == null && current) {
                currentStep = step;
            } else if (currentStep != null && nextStep == null && elapsedMinutes < startMinute) {
                nextStep = step;
            }

            cursor = endMinute;
        }

        if (currentStep == null) {
            nextStep = steps.stream()
                    .filter(step -> elapsedMinutes < step.startMinute())
                    .findFirst()
                    .orElse(null);
        }

        boolean completed = !steps.isEmpty() && elapsedMinutes >= steps.get(steps.size() - 1).endMinute();
        Level level = room.getLevel();

        return new RoomTimelineDTO(
                room.getId(),
                room.getRoomCode(),
                level.getLevelNumber(),
                level.getTitle(),
                room.getStartedAt(),
                elapsedMinutes,
                completed,
                currentStep,
                nextStep,
                steps
        );
    }

    private int safeDuration(Integer durationMinutes) {
        if (durationMinutes == null || durationMinutes < 1) {
            return 10;
        }
        return durationMinutes;
    }
}
