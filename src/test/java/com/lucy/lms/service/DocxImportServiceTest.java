package com.lucy.lms.service;

import org.junit.jupiter.api.Test;
import org.apache.poi.xwpf.usermodel.XWPFDocument;

import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class DocxImportServiceTest {

    private final DocxImportService service = new DocxImportService(null, null, null, null, null, null);

    @Test
    void parseLevelLineParsesIndividualEnglishLevelHeading() throws Exception {
        assertParsedLevel("\uD83D\uDD35 LEVEL 31 \u2013 MY TYPICAL WEEK", 31, "MY TYPICAL WEEK");
    }

    @Test
    void parseLevelLineParsesIndividualJapaneseLevelHeading() throws Exception {
        assertParsedLevel(
                "\uD83D\uDD39 \u30ec\u30d9\u30eb31 \u2013 \u79c1\u306e1\u9031\u9593",
                31,
                "\u79c1\u306e1\u9031\u9593"
        );
    }

    @Test
    void parseLevelLineParsesChineseNumberedHeading() throws Exception {
        assertParsedLevel("31. \u6211\u7684\u5b66\u4e60\u8ba1\u5212", 31, "\u6211\u7684\u5b66\u4e60\u8ba1\u5212");
    }

    @Test
    void parseLevelLineIgnoresEnglishRangeHeading() throws Exception {
        assertIgnoredRangeHeading("LEVELS 31\u201335: CONFIDENT DAILY COMMUNICATION");
    }

    @Test
    void parseLevelLineIgnoresJapaneseRangeHeading() throws Exception {
        assertIgnoredRangeHeading("\uD83D\uDD35 \u30ec\u30d9\u30eb31\u201335\uFF1A\u65e5\u5e38\u30b3\u30df\u30e5\u30cb\u30b1\u30fc\u30b7\u30e7\u30f3\u5f37\u5316");
    }

    @Test
    void parseLevelLineIgnoresJapaneseRangeHeadingWithParentheses() throws Exception {
        assertIgnoredRangeHeading("\uD83D\uDD37 \u30ec\u30d9\u30eb71\u201380\uFF08B1+ \u2192 B2-\uFF09");
    }

    @Test
    @SuppressWarnings("unchecked")
    void extractNonEmptyLinesNormalizesNonBreakingSpacesBeforeChineseHeadings() throws Exception {
        Path file = Path.of("sample-docx", "Chinese - level 1-30.docx");
        try (InputStream inputStream = Files.newInputStream(file);
             XWPFDocument document = new XWPFDocument(inputStream)) {
            Method method = DocxImportService.class.getDeclaredMethod("extractNonEmptyLines", XWPFDocument.class);
            method.setAccessible(true);
            List<String> lines = (List<String>) method.invoke(service, document);

            assertTrue(lines.stream().anyMatch(line -> line.startsWith("12. ")));
            assertTrue(lines.stream().anyMatch(line -> line.startsWith("13. ")));
        }
    }

    private void assertParsedLevel(String line, int expectedNumber, String expectedTitle) throws Exception {
        Object parsedLevel = parseLevelLine(line);

        assertNotNull(parsedLevel);
        assertEquals(expectedNumber, invokeAccessor(parsedLevel, "levelNumber"));
        assertEquals(expectedTitle, invokeAccessor(parsedLevel, "title"));
    }

    private void assertIgnoredRangeHeading(String line) throws Exception {
        assertNull(parseLevelLine(line));
    }

    private Object parseLevelLine(String line) throws Exception {
        Method method = DocxImportService.class.getDeclaredMethod("parseLevelLine", String.class);
        method.setAccessible(true);
        return method.invoke(service, line);
    }

    private Object invokeAccessor(Object target, String methodName) throws Exception {
        Method method = target.getClass().getDeclaredMethod(methodName);
        method.setAccessible(true);
        return method.invoke(target);
    }
}
