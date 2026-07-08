package com.lucy.lms.service;

import com.lucy.lms.dto.DocxPreviewDTO;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DocxReaderService {

    private static final int PREVIEW_LINE_LIMIT = 50;
    private static final String JAPANESE_STAGE = "\u30b9\u30c6\u30fc\u30b8";
    private static final String JAPANESE_LEVEL = "\u30ec\u30d9\u30eb";
    private static final Pattern ENGLISH_STAGE_PATTERN = Pattern.compile("(?i)\\bSTAGE\\s*([1-3])\\b");
    private static final Pattern JAPANESE_STAGE_PATTERN = Pattern.compile(JAPANESE_STAGE + "\\s*([1-3])");
    private static final Pattern LEVEL_RANGE_PATTERN = Pattern.compile(
            "(?:LEVELS?|" + JAPANESE_LEVEL + ")?\\s*(1\\s*[-\u2013]\\s*30|31\\s*[-\u2013]\\s*60|61\\s*[-\u2013]\\s*100)",
            Pattern.CASE_INSENSITIVE
    );

    public DocxPreviewDTO preview(MultipartFile file) throws IOException {
        String fileName = file.getOriginalFilename();

        try (XWPFDocument document = new XWPFDocument(file.getInputStream())) {
            List<String> lines = extractNonEmptyLines(document);

            return new DocxPreviewDTO(
                    fileName,
                    document.getParagraphs().size(),
                    lines.size(),
                    detectLanguage(fileName),
                    detectStage(fileName),
                    detectLevelRange(fileName),
                    lines.stream().limit(PREVIEW_LINE_LIMIT).toList()
            );
        }
    }

    private List<String> extractNonEmptyLines(XWPFDocument document) {
        List<String> lines = new ArrayList<>();

        for (XWPFParagraph paragraph : document.getParagraphs()) {
            String text = paragraph.getText();
            if (text == null) {
                continue;
            }

            for (String line : text.replace('\r', '\n').split("\\n+")) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty()) {
                    lines.add(trimmed);
                }
            }
        }

        return lines;
    }

    private String detectLanguage(String fileName) {
        String normalizedFileName = normalizeFileName(fileName);
        String lowerFileName = normalizedFileName.toLowerCase(Locale.ROOT);

        if (lowerFileName.contains("eng") || lowerFileName.contains("english")) {
            return "ENGLISH";
        }
        if (lowerFileName.contains("chinese")) {
            return "CHINESE";
        }
        if (lowerFileName.contains("japanese") || normalizedFileName.contains(JAPANESE_STAGE)) {
            return "JAPANESE";
        }

        return "UNKNOWN";
    }

    private String detectStage(String fileName) {
        String normalizedFileName = normalizeFileName(fileName);

        Matcher englishMatcher = ENGLISH_STAGE_PATTERN.matcher(normalizedFileName);
        if (englishMatcher.find()) {
            return "STAGE " + englishMatcher.group(1);
        }

        Matcher japaneseMatcher = JAPANESE_STAGE_PATTERN.matcher(normalizedFileName);
        if (japaneseMatcher.find()) {
            return "STAGE " + japaneseMatcher.group(1);
        }

        return null;
    }

    private String detectLevelRange(String fileName) {
        Matcher matcher = LEVEL_RANGE_PATTERN.matcher(normalizeFileName(fileName));
        if (!matcher.find()) {
            return null;
        }

        return matcher.group(1).replaceAll("\\s+", "").replace('\u2013', '-');
    }

    private String normalizeFileName(String fileName) {
        return fileName == null ? "" : fileName;
    }
}
