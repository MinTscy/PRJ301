package com.lucy.lms.service;

import com.lucy.lms.dto.ImportResultDTO;
import com.lucy.lms.entity.AIQuestion;
import com.lucy.lms.entity.Content;
import com.lucy.lms.entity.Language;
import com.lucy.lms.entity.Level;
import com.lucy.lms.entity.Stage;
import com.lucy.lms.entity.SubLevel;
import com.lucy.lms.repository.AIQuestionRepository;
import com.lucy.lms.repository.ContentRepository;
import com.lucy.lms.repository.LanguageRepository;
import com.lucy.lms.repository.LevelRepository;
import com.lucy.lms.repository.StageRepository;
import com.lucy.lms.repository.SubLevelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocxImportService {

    private static final int DEFAULT_SUB_LEVEL_ORDER = 1;
    private static final int DEFAULT_SUB_LEVEL_DURATION_MINUTES = 15;
    private static final String DEFAULT_SUB_LEVEL_TITLE = "Main Content";
    private static final String JAPANESE_STAGE = "\u30b9\u30c6\u30fc\u30b8";
    private static final String JAPANESE_LEVEL = "\u30ec\u30d9\u30eb";

    private static final Pattern ENGLISH_STAGE_PATTERN = Pattern.compile("(?i)\\bSTAGE\\s*([1-3])\\b");
    private static final Pattern JAPANESE_STAGE_PATTERN = Pattern.compile(JAPANESE_STAGE + "\\s*([1-3])");
    private static final Pattern LEVEL_RANGE_PATTERN = Pattern.compile("(1\\s*[-\u2013]\\s*30|31\\s*[-\u2013]\\s*60|61\\s*[-\u2013]\\s*100)");
    private static final Pattern LEVEL_RANGE_HEADING_PATTERN = Pattern.compile(
            "(?i)^(?:[\\p{So}\\p{Cn}\\s]*)(?:LEVELS?|" + JAPANESE_LEVEL + ")\\s*\\d{1,3}\\s*[-\u2013]\\s*\\d{1,3}\\s*(?:[:\uFF1A(\uFF08].*|$)"
    );
    private static final Pattern ENGLISH_LEVEL_PATTERN = Pattern.compile("(?i)^(?:[\\p{So}\\p{Cn}\\s]*)LEVEL\\s+(\\d{1,3})(?:\\s*[-\u2013]\\s*(.+))?$");
    private static final Pattern JAPANESE_LEVEL_PATTERN = Pattern.compile("^[\\p{So}\\p{Cn}\\s]*" + JAPANESE_LEVEL + "\\s*(\\d{1,3})(?:\\s*[-\u2013]\\s*(.+))?$");
    private static final Pattern CHINESE_LEVEL_PATTERN = Pattern.compile("^(\\d{1,3})\\s*[.\uFF0E\u3001]\\s*(.+)$");
    private static final Pattern SUB_LEVEL_PATTERN = Pattern.compile("(?i)^(?:Sub[- ]?level\\s*)?(\\d{1,2})\\s*[:\uFF1A]\\s*(.+)$");
    private static final Pattern QUESTION_PATTERN = Pattern.compile("(?i)^(Q\\d*|Question)\\s*[:\uFF1A]\\s*(.+)$");

    private final LanguageRepository languageRepository;
    private final StageRepository stageRepository;
    private final LevelRepository levelRepository;
    private final SubLevelRepository subLevelRepository;
    private final ContentRepository contentRepository;
    private final AIQuestionRepository aiQuestionRepository;

    @Transactional
    public ImportResultDTO importDocx(MultipartFile file) throws IOException {
        String fileName = file.getOriginalFilename();
        try (InputStream inputStream = file.getInputStream()) {
            return importDocx(fileName, inputStream);
        }
    }

    @Transactional
    public ImportResultDTO importDocx(Path filePath) throws IOException {
        String fileName = filePath.getFileName().toString();
        try (InputStream inputStream = Files.newInputStream(filePath)) {
            return importDocx(fileName, inputStream);
        }
    }

    private ImportResultDTO importDocx(String fileName, InputStream inputStream) throws IOException {
        if (fileName == null || !fileName.toLowerCase(Locale.ROOT).endsWith(".docx")) {
            throw new BadRequestException("Only .docx files are supported.");
        }

        DetectedLanguage detectedLanguage = detectLanguage(fileName);
        String levelRange = detectLevelRange(fileName);
        ParsedLevelRange parsedLevelRange = parseLevelRange(levelRange);
        Integer stageNumber = detectStageNumber(fileName, levelRange);

        Language language = languageRepository.findByCode(detectedLanguage.code())
                .orElseGet(() -> languageRepository.save(Language.builder()
                        .code(detectedLanguage.code())
                        .name(detectedLanguage.name())
                        .build()));

        Stage stage = stageRepository.findByStageNumberAndLanguage(stageNumber, language)
                .orElseGet(() -> stageRepository.save(Stage.builder()
                        .stageNumber(stageNumber)
                        .name("Stage " + stageNumber)
                        .description("Imported from " + fileName)
                        .language(language)
                        .build()));

        ImportCounter counter = new ImportCounter();

        try (XWPFDocument document = new XWPFDocument(inputStream)) {
            parseLines(extractNonEmptyLines(document), stage, detectedLanguage, parsedLevelRange, counter);
        }

        log.info(
                "DOCX import completed: fileName={}, detectedLanguage={}, detectedStage={}, detectedLevelRange={}, importedLevels={}, importedContents={}, importedQuestions={}",
                fileName,
                detectedLanguage.name(),
                stageNumber,
                levelRange,
                counter.importedLevels,
                counter.importedContents,
                counter.importedQuestions
        );

        return new ImportResultDTO(
                fileName,
                detectedLanguage.code(),
                stageNumber,
                levelRange,
                counter.importedLevels,
                counter.importedSubLevels,
                counter.importedContents,
                counter.importedQuestions,
                "SUCCESS",
                "DOCX file imported successfully."
        );
    }

    private void parseLines(
            List<String> lines,
            Stage stage,
            DetectedLanguage language,
            ParsedLevelRange levelRange,
            ImportCounter counter
    ) {
        Level currentLevel = null;
        SubLevel currentSubLevel = null;
        boolean currentLevelIsNew = false;

        for (String line : lines) {
            ParsedLevel parsedLevel = parseLevelLine(line);
            if (parsedLevel != null) {
                if (!isInLevelRange(parsedLevel.levelNumber(), levelRange)) {
                    currentLevel = null;
                    currentSubLevel = null;
                    currentLevelIsNew = false;
                    continue;
                }

                Level existingLevel = levelRepository.findByLevelNumberAndStage(parsedLevel.levelNumber(), stage).orElse(null);
                if (existingLevel != null) {
                    currentLevel = null;
                    currentSubLevel = null;
                    currentLevelIsNew = false;
                    continue;
                }

                currentLevel = levelRepository.save(Level.builder()
                        .levelNumber(parsedLevel.levelNumber())
                        .title(parsedLevel.title())
                        .durationMinutes(defaultLevelDuration(stage.getStageNumber()))
                        .stage(stage)
                        .build());
                currentSubLevel = createDefaultSubLevel(currentLevel, counter);
                currentLevelIsNew = true;
                counter.importedLevels++;
                continue;
            }

            if (currentLevel == null || !currentLevelIsNew) {
                continue;
            }

            ParsedSubLevel parsedSubLevel = parseSubLevelLine(line, language);
            if (parsedSubLevel != null) {
                currentSubLevel = getOrCreateSubLevel(currentLevel, parsedSubLevel, counter);
                continue;
            }

            if (isQuestionLine(line)) {
                aiQuestionRepository.save(AIQuestion.builder()
                        .questionText(cleanQuestionText(line))
                        .subLevel(currentSubLevel)
                        .build());
                counter.importedQuestions++;
                continue;
            }

            contentRepository.save(Content.builder()
                    .contentText(line)
                    .contentType(detectContentType(line))
                    .subLevel(currentSubLevel)
                    .build());
            counter.importedContents++;
        }
    }

    private List<String> extractNonEmptyLines(XWPFDocument document) {
        List<String> lines = new ArrayList<>();

        for (IBodyElement element : document.getBodyElements()) {
            if (element instanceof XWPFParagraph paragraph) {
                addTextLines(lines, paragraph.getText());
            } else if (element instanceof XWPFTable table) {
                for (XWPFTableRow row : table.getRows()) {
                    List<String> cells = new ArrayList<>();
                    for (XWPFTableCell cell : row.getTableCells()) {
                        cells.add(cell.getText());
                    }
                    addTextLines(lines, String.join(" | ", cells));
                }
            }
        }

        return lines;
    }

    private void addTextLines(List<String> lines, String text) {
        if (text == null) {
            return;
        }

        for (String line : text.replace('\r', '\n').split("\\n+")) {
            String trimmed = line.replace('\u00A0', ' ').strip();
            if (!trimmed.isEmpty()) {
                lines.add(trimmed);
            }
        }
    }

    private ParsedLevel parseLevelLine(String line) {
        if (isLevelRangeLine(line)) {
            return null;
        }

        Matcher englishMatcher = ENGLISH_LEVEL_PATTERN.matcher(line);
        if (englishMatcher.matches()) {
            String title = cleanTitle(englishMatcher.group(2));
            if (isLevelRangeHeading(title)) {
                return null;
            }
            return new ParsedLevel(Integer.parseInt(englishMatcher.group(1)), title);
        }

        Matcher japaneseMatcher = JAPANESE_LEVEL_PATTERN.matcher(line);
        if (japaneseMatcher.matches()) {
            String title = cleanTitle(japaneseMatcher.group(2));
            if (isLevelRangeHeading(title)) {
                return null;
            }
            return new ParsedLevel(Integer.parseInt(japaneseMatcher.group(1)), title);
        }

        Matcher chineseMatcher = CHINESE_LEVEL_PATTERN.matcher(line);
        if (chineseMatcher.matches()) {
            return new ParsedLevel(Integer.parseInt(chineseMatcher.group(1)), cleanTitle(chineseMatcher.group(2)));
        }

        return null;
    }

    private boolean isLevelRangeLine(String line) {
        return line != null && LEVEL_RANGE_HEADING_PATTERN.matcher(line).matches();
    }

    private ParsedSubLevel parseSubLevelLine(String line, DetectedLanguage language) {
        if (!"EN".equals(language.code())) {
            return null;
        }

        Matcher matcher = SUB_LEVEL_PATTERN.matcher(line);
        if (!matcher.matches()) {
            return null;
        }

        int subOrder = Integer.parseInt(matcher.group(1));
        if (subOrder < 1 || subOrder > 6) {
            return null;
        }

        return new ParsedSubLevel(subOrder, cleanTitle(matcher.group(2)));
    }

    private boolean isQuestionLine(String line) {
        return QUESTION_PATTERN.matcher(line).matches()
                || line.toLowerCase(Locale.ROOT).contains("question")
                || line.toLowerCase(Locale.ROOT).contains("practice")
                || line.endsWith("?")
                || line.endsWith("\uFF1F");
    }

    private String cleanQuestionText(String line) {
        Matcher matcher = QUESTION_PATTERN.matcher(line);
        if (matcher.matches()) {
            return matcher.group(2).trim();
        }

        return line;
    }

    private String detectContentType(String line) {
        String lowerLine = line.toLowerCase(Locale.ROOT);
        if (lowerLine.contains("topic") || lowerLine.contains("lesson") || lowerLine.contains("unit")) {
            return "TOPIC";
        }
        if (line.startsWith("\uD83D\uDC49")) {
            return "ANSWER";
        }
        return "TEXT";
    }

    private SubLevel createDefaultSubLevel(Level level, ImportCounter counter) {
        SubLevel subLevel = subLevelRepository.findByLevelAndSubOrder(level, DEFAULT_SUB_LEVEL_ORDER)
                .orElseGet(() -> {
                    counter.importedSubLevels++;
                    return subLevelRepository.save(SubLevel.builder()
                            .subOrder(DEFAULT_SUB_LEVEL_ORDER)
                            .title(DEFAULT_SUB_LEVEL_TITLE)
                            .durationMinutes(DEFAULT_SUB_LEVEL_DURATION_MINUTES)
                            .level(level)
                            .build());
                });

        return subLevel;
    }

    private DetectedLanguage detectLanguage(String fileName) {
        String lowerFileName = fileName.toLowerCase(Locale.ROOT);
        if (lowerFileName.contains("eng") || lowerFileName.contains("english")) {
            return new DetectedLanguage("EN", "ENGLISH");
        }
        if (lowerFileName.contains("chinese")) {
            return new DetectedLanguage("ZH", "CHINESE");
        }
        if (lowerFileName.contains("japanese") || fileName.contains(JAPANESE_STAGE)) {
            return new DetectedLanguage("JA", "JAPANESE");
        }

        throw new BadRequestException("Cannot detect language from filename: " + fileName);
    }

    private Integer detectStageNumber(String fileName, String levelRange) {
        Matcher englishMatcher = ENGLISH_STAGE_PATTERN.matcher(fileName);
        if (englishMatcher.find()) {
            return Integer.parseInt(englishMatcher.group(1));
        }

        Matcher japaneseMatcher = JAPANESE_STAGE_PATTERN.matcher(fileName);
        if (japaneseMatcher.find()) {
            return Integer.parseInt(japaneseMatcher.group(1));
        }

        if (levelRange == null) {
            throw new BadRequestException("Cannot detect stage from filename: " + fileName);
        }

        return switch (levelRange) {
            case "1-30" -> 1;
            case "31-60" -> 2;
            case "61-100" -> 3;
            default -> throw new BadRequestException("Cannot detect stage from filename: " + fileName);
        };
    }

    private String detectLevelRange(String fileName) {
        Matcher matcher = LEVEL_RANGE_PATTERN.matcher(fileName);
        if (!matcher.find()) {
            return null;
        }

        return matcher.group(1).replaceAll("\\s+", "").replace('\u2013', '-');
    }

    private ParsedLevelRange parseLevelRange(String levelRange) {
        if (levelRange == null) {
            return null;
        }

        String[] bounds = levelRange.split("-");
        if (bounds.length != 2) {
            return null;
        }

        return new ParsedLevelRange(Integer.parseInt(bounds[0]), Integer.parseInt(bounds[1]));
    }

    private boolean isInLevelRange(Integer levelNumber, ParsedLevelRange levelRange) {
        if (levelRange == null) {
            return true;
        }

        return levelNumber >= levelRange.start() && levelNumber <= levelRange.end();
    }

    private boolean isLevelRangeHeading(String title) {
        return title != null && title.matches("^\\d{1,3}\\s*[:：].*");
    }

    private int defaultLevelDuration(Integer stageNumber) {
        if (stageNumber != null && stageNumber == 3) {
            return 120;
        }
        if (stageNumber != null && stageNumber == 2) {
            return 90;
        }
        return 60;
    }

    private String cleanTitle(String title) {
        if (title == null || title.isBlank()) {
            return "Untitled";
        }

        return title.trim();
    }

    private SubLevel getOrCreateSubLevel(Level level, ParsedSubLevel parsedSubLevel, ImportCounter counter) {
        return subLevelRepository.findByLevelAndSubOrder(level, parsedSubLevel.subOrder())
                .map(existing -> {
                    if (DEFAULT_SUB_LEVEL_TITLE.equals(existing.getTitle())) {
                        existing.setTitle(parsedSubLevel.title());
                        return subLevelRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    counter.importedSubLevels++;
                    return subLevelRepository.save(SubLevel.builder()
                            .subOrder(parsedSubLevel.subOrder())
                            .title(parsedSubLevel.title())
                            .durationMinutes(DEFAULT_SUB_LEVEL_DURATION_MINUTES)
                            .level(level)
                            .build());
                });
    }

    private record DetectedLanguage(String code, String name) {
    }

    private record ParsedLevel(Integer levelNumber, String title) {
    }

    private record ParsedSubLevel(Integer subOrder, String title) {
    }

    private record ParsedLevelRange(Integer start, Integer end) {
    }

    private static class ImportCounter {
        private int importedLevels;
        private int importedSubLevels;
        private int importedContents;
        private int importedQuestions;
    }
}
