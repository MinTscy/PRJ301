package com.lucy.lms.service;

import com.lucy.lms.dto.LanguageCoverageDTO;
import com.lucy.lms.dto.StageCoverageDTO;
import com.lucy.lms.entity.Language;
import com.lucy.lms.entity.Level;
import com.lucy.lms.entity.Stage;
import com.lucy.lms.repository.LanguageRepository;
import com.lucy.lms.repository.LevelRepository;
import com.lucy.lms.repository.StageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DataCoverageService {

    private static final Map<Integer, LevelRange> EXPECTED_STAGE_RANGES = Map.of(
            1, new LevelRange(1, 30),
            2, new LevelRange(31, 60),
            3, new LevelRange(61, 100)
    );

    private final LanguageRepository languageRepository;
    private final StageRepository stageRepository;
    private final LevelRepository levelRepository;

    public List<LanguageCoverageDTO> getCoverage() {
        return languageRepository.findAll().stream()
                .sorted(Comparator.comparing(Language::getCode, Comparator.nullsLast(String::compareToIgnoreCase)))
                .map(this::toLanguageCoverage)
                .toList();
    }

    private LanguageCoverageDTO toLanguageCoverage(Language language) {
        List<StageCoverageDTO> stageCoverages = EXPECTED_STAGE_RANGES.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> toStageCoverage(language, entry.getKey(), entry.getValue()))
                .toList();
        int totalExpectedLevels = stageCoverages.stream()
                .mapToInt(StageCoverageDTO::expectedLevels)
                .sum();
        int importedLevels = stageCoverages.stream()
                .mapToInt(StageCoverageDTO::importedLevels)
                .sum();
        int missingLevels = stageCoverages.stream()
                .mapToInt(StageCoverageDTO::missingLevels)
                .sum();

        return new LanguageCoverageDTO(
                language.getCode(),
                language.getName(),
                totalExpectedLevels,
                importedLevels,
                missingLevels,
                missingLevels == 0,
                stageCoverages
        );
    }

    private StageCoverageDTO toStageCoverage(Language language, Integer stageNumber, LevelRange expectedRange) {
        Stage stage = stageRepository.findByStageNumberAndLanguage(stageNumber, language).orElse(null);
        Set<Integer> importedLevelNumbers = stage == null
                ? Set.of()
                : levelRepository.findByStage(stage).stream()
                .map(Level::getLevelNumber)
                .collect(Collectors.toSet());
        List<Integer> missingLevelNumbers = IntStream.rangeClosed(expectedRange.start(), expectedRange.end())
                .filter(levelNumber -> !importedLevelNumbers.contains(levelNumber))
                .boxed()
                .toList();
        int expectedLevels = expectedRange.end() - expectedRange.start() + 1;
        int importedLevels = expectedLevels - missingLevelNumbers.size();

        return new StageCoverageDTO(
                stageNumber,
                expectedRange.start(),
                expectedRange.end(),
                expectedLevels,
                importedLevels,
                missingLevelNumbers.size(),
                stage != null,
                missingLevelNumbers.isEmpty(),
                missingLevelNumbers
        );
    }

    private record LevelRange(int start, int end) {
    }
}
