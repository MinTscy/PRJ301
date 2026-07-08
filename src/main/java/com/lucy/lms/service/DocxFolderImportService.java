package com.lucy.lms.service;

import com.lucy.lms.dto.FolderImportResultDTO;
import com.lucy.lms.dto.ImportResultDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocxFolderImportService {

    private static final String SAMPLE_DOCX_FOLDER = "sample-docx";

    private final DocxImportService docxImportService;

    public FolderImportResultDTO importFromSampleFolder() {
        Path sampleDocxFolder = Path.of(SAMPLE_DOCX_FOLDER).toAbsolutePath().normalize();
        if (!Files.isDirectory(sampleDocxFolder)) {
            throw new BadRequestException("Folder not found: " + sampleDocxFolder);
        }

        List<Path> docxFiles = listDocxFiles(sampleDocxFolder);
        List<ImportResultDTO> results = docxFiles.stream()
                .map(this::importSingleFile)
                .toList();

        int successFiles = (int) results.stream()
                .filter(result -> "SUCCESS".equals(result.status()))
                .count();
        int failedFiles = results.size() - successFiles;

        log.info(
                "DOCX folder import completed: folder={}, totalFiles={}, successFiles={}, failedFiles={}",
                sampleDocxFolder,
                results.size(),
                successFiles,
                failedFiles
        );

        return new FolderImportResultDTO(
                results.size(),
                successFiles,
                failedFiles,
                results
        );
    }

    private List<Path> listDocxFiles(Path folder) {
        try (var paths = Files.list(folder)) {
            return paths
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().toLowerCase().endsWith(".docx"))
                    .sorted()
                    .toList();
        } catch (IOException exception) {
            throw new BadRequestException("Cannot read folder: " + folder);
        }
    }

    private ImportResultDTO importSingleFile(Path filePath) {
        String fileName = filePath.getFileName().toString();
        log.info("Starting DOCX folder item import: fileName={}, path={}", fileName, filePath);

        try {
            ImportResultDTO result = docxImportService.importDocx(filePath);
            log.info("Finished DOCX folder item import: fileName={}, status={}", fileName, result.status());
            return result;
        } catch (Exception exception) {
            log.error("Failed DOCX folder item import: fileName={}, message={}", fileName, exception.getMessage(), exception);
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
