package com.lucy.lms.service;

import com.lucy.lms.dto.RoomTimelineDTO;
import com.lucy.lms.entity.Level;
import com.lucy.lms.entity.LiveRoom;
import com.lucy.lms.entity.SubLevel;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoomTimelineCalculatorTest {

    private final RoomTimelineCalculator calculator = new RoomTimelineCalculator();

    @Test
    void calculateMarksCurrentAndNextSubLevelFromElapsedTime() {
        Instant startedAt = Instant.parse("2026-06-18T00:00:00Z");
        LiveRoom room = room(startedAt);

        RoomTimelineDTO timeline = calculator.calculate(
                room,
                List.of(subLevel(1L, 1), subLevel(2L, 2), subLevel(3L, 3)),
                startedAt.plusSeconds(12 * 60L)
        );

        assertEquals(12, timeline.elapsedMinutes());
        assertFalse(timeline.completed());
        assertEquals(2, timeline.currentStep().subOrder());
        assertEquals(3, timeline.nextStep().subOrder());
        assertEquals(10, timeline.currentStep().startMinute());
        assertEquals(20, timeline.currentStep().endMinute());
    }

    @Test
    void calculateMarksRoomCompletedAfterLastSubLevelEnds() {
        Instant startedAt = Instant.parse("2026-06-18T00:00:00Z");
        LiveRoom room = room(startedAt);

        RoomTimelineDTO timeline = calculator.calculate(
                room,
                List.of(subLevel(1L, 1), subLevel(2L, 2), subLevel(3L, 3)),
                startedAt.plusSeconds(30 * 60L)
        );

        assertTrue(timeline.completed());
        assertEquals(30, timeline.elapsedMinutes());
        assertEquals(null, timeline.currentStep());
        assertEquals(null, timeline.nextStep());
    }

    private LiveRoom room(Instant startedAt) {
        return LiveRoom.builder()
                .id(10L)
                .roomCode("LUCY-TEST")
                .startedAt(startedAt)
                .level(Level.builder()
                        .id(20L)
                        .levelNumber(1)
                        .title("Saying Who I Am")
                        .durationMinutes(60)
                        .build())
                .build();
    }

    private SubLevel subLevel(Long id, Integer order) {
        return SubLevel.builder()
                .id(id)
                .subOrder(order)
                .title("Sub-level " + order)
                .durationMinutes(10)
                .build();
    }
}
