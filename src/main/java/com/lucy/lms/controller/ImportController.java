package com.lucy.lms.controller;

import com.lucy.lms.dto.DocxPreviewDTO;
import com.lucy.lms.dto.FolderImportResultDTO;
import com.lucy.lms.dto.ImportResultDTO;
import com.lucy.lms.service.DocxBatchImportService;
import com.lucy.lms.service.DocxFolderImportService;
import com.lucy.lms.service.DocxImportService;
import com.lucy.lms.service.DocxReaderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
@Tag(name = "Import API", description = "Preview and import DOCX learning materials.")
public class ImportController {

    private final DocxReaderService docxReaderService;
    private final DocxImportService docxImportService;
    private final DocxBatchImportService docxBatchImportService;
    private final DocxFolderImportService docxFolderImportService;

    @Operation(summary = "Preview DOCX import file", description = "Reads a DOCX upload and returns detected metadata plus preview lines without saving data.")
    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocxPreviewDTO preview(@Parameter(description = "DOCX file to preview") @RequestPart("file") MultipartFile file)
            throws IOException {
        return docxReaderService.preview(file);
    }

    @Operation(summary = "Import DOCX file into LMS database", description = "Imports one uploaded DOCX file into LMS content tables.")
    @PostMapping(value = "/docx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportResultDTO importDocx(@Parameter(description = "DOCX file to import") @RequestPart("file") MultipartFile file)
            throws IOException {
        return docxImportService.importDocx(file);
    }

    @Operation(summary = "Import multiple DOCX files into LMS database", description = "Imports multiple uploaded DOCX files and returns one result per file.")
    @PostMapping(value = "/docx/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<ImportResultDTO> importDocxBatch(
            @Parameter(description = "DOCX files to import") @RequestPart("files") List<MultipartFile> files
    ) {
        return docxBatchImportService.importBatch(files);
    }

    @Operation(summary = "Import all DOCX files from local sample-docx folder", description = "Demo-only endpoint that imports all DOCX files from the project root sample-docx folder.")
    @PostMapping("/docx/from-folder")
    public FolderImportResultDTO importDocxFromFolder() {
        return docxFolderImportService.importFromSampleFolder();
    }
}
