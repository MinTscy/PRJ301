package com.lucy.lms.dto;

import java.util.List;

public record DocxPreviewDTO(
        String fileName,
        int totalParagraphs,
        int totalLines,
        String detectedLanguage,
        String detectedStage,
        String detectedLevelRange,
        List<String> previewLines
) {
}
