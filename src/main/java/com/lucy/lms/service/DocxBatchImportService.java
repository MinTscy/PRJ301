package com.lucy.lms.service;

import com.lucy.lms.dto.ImportResultDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocxBatchImportService {

    private final DocxImportService docxImportService;

    public List<ImportResultDTO> importBatch(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new BadRequestException("At least one .docx file is required.");
        }

        return files.stream()
                .map(this::importSingleFile)
                .toList();
    }

    private ImportResultDTO importSingleFile(MultipartFile file) {
        String fileName = file.getOriginalFilename();
        log.info("Starting DOCX batch item import: fileName={}", fileName);

        try {
            ImportResultDTO result = docxImportService.importDocx(file);
            log.info("Finished DOCX batch item import: fileName={}, status={}", fileName, result.status());
            return result;
        } catch (Exception exception) {
            log.error("Failed DOCX batch item import: fileName={}, message={}", fileName, exception.getMessage(), exception);
            return new ImportResultDTO(
                    fileName,
                    null,
                    null,
                    null,
                    0,
                    0,
                    0,
                    0,
                    "FAILED",
                    exception.getMessage()
            );
        }
    }
}
