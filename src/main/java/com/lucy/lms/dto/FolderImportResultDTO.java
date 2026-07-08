package com.lucy.lms.dto;

import java.util.List;

public record FolderImportResultDTO(
        int totalFiles,
        int successFiles,
        int failedFiles,
        List<ImportResultDTO> results
) {
}
