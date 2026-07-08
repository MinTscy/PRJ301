package com.lucy.lms.dto;

import java.util.List;

public record SubLevelDTO(
        Long id,
        Integer subOrder,
        String title,
        Integer durationMinutes,
        List<ContentDTO> contents,
        List<AIQuestionDTO> aiQuestions
) {
}
