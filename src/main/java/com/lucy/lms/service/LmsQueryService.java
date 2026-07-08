package com.lucy.lms.service;

import com.lucy.lms.dto.AIQuestionDTO;
import com.lucy.lms.dto.ContentDTO;
import com.lucy.lms.dto.LanguageDTO;
import com.lucy.lms.dto.LevelDTO;
import com.lucy.lms.dto.LevelDetailDTO;
import com.lucy.lms.dto.StageDTO;
import com.lucy.lms.dto.SubLevelDTO;
import com.lucy.lms.entity.AIQuestion;
import com.lucy.lms.entity.Content;
import com.lucy.lms.entity.Language;
import com.lucy.lms.entity.Level;
import com.lucy.lms.entity.Stage;
import com.lucy.lms.entity.SubLevel;
import com.lucy.lms.repository.LanguageRepository;
import com.lucy.lms.repository.LevelRepository;
import com.lucy.lms.repository.StageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LmsQueryService {

    private final LanguageRepository languageRepository;
    private final StageRepository stageRepository;
    private final LevelRepository levelRepository;

    public List<LanguageDTO> getLanguages() {
        return languageRepository.findAll().stream()
                .sorted(Comparator.comparing(Language::getCode, Comparator.nullsLast(String::compareToIgnoreCase)))
                .map(this::toLanguageDTO)
                .toList();
    }

    public List<StageDTO> getStages() {
        return stageRepository.findAll().stream()
                .sorted(Comparator
                        .comparing((Stage stage) -> stage.getLanguage().getCode(), Comparator.nullsLast(String::compareToIgnoreCase))
                        .thenComparing(Stage::getStageNumber, Comparator.nullsLast(Integer::compareTo)))
                .map(this::toStageDTO)
                .toList();
    }

    public List<LevelDTO> getLevels() {
        return levelRepository.findAll().stream()
                .sorted(levelComparator())
                .map(this::toLevelDTO)
                .toList();
    }

    public LevelDTO getLevelById(Long id) {
        return levelRepository.findById(id)
                .map(this::toLevelDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Level not found with id: " + id));
    }

    public List<LevelDTO> getLevelsByNumber(Integer levelNumber) {
        List<LevelDTO> levels = levelRepository.findByLevelNumber(levelNumber).stream()
                .sorted(levelComparator())
                .map(this::toLevelDTO)
                .toList();

        if (levels.isEmpty()) {
            throw new ResourceNotFoundException("Level not found with number: " + levelNumber);
        }

        return levels;
    }

    public LevelDetailDTO getLevelDetail(Long id) {
        Level level = levelRepository.findDetailById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Level not found with id: " + id));

        return new LevelDetailDTO(
                level.getId(),
                level.getLevelNumber(),
                level.getTitle(),
                level.getDurationMinutes(),
                toStageDTO(level.getStage()),
                level.getSubLevels().stream()
                        .sorted(Comparator.comparing(SubLevel::getSubOrder, Comparator.nullsLast(Integer::compareTo)))
                        .map(this::toSubLevelDTO)
                        .toList()
        );
    }

    public List<LevelDTO> getLevelsByLanguageCode(String code) {
        Language language = getLanguageByCode(code);
        List<LevelDTO> levels = levelRepository.findByStageLanguageCode(language.getCode()).stream()
                .sorted(levelComparator())
                .map(this::toLevelDTO)
                .toList();

        if (levels.isEmpty()) {
            throw new ResourceNotFoundException("No levels found for language code: " + code);
        }

        return levels;
    }

    public List<LevelDTO> getLevelsByLanguageCodeAndStageNumber(String code, Integer stageNumber) {
        Language language = getLanguageByCode(code);
        Stage stage = stageRepository.findByStageNumberAndLanguage(stageNumber, language)
                .orElseThrow(() -> new ResourceNotFoundException("Stage not found with number " + stageNumber + " and language code: " + code));

        List<LevelDTO> levels = levelRepository.findByStage(stage).stream()
                .sorted(levelComparator())
                .map(this::toLevelDTO)
                .toList();

        if (levels.isEmpty()) {
            throw new ResourceNotFoundException("No levels found for stage " + stageNumber + " and language code: " + code);
        }

        return levels;
    }

    private Language getLanguageByCode(String code) {
        return languageRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Language not found with code: " + code));
    }

    private LanguageDTO toLanguageDTO(Language language) {
        return new LanguageDTO(
                language.getId(),
                language.getCode(),
                language.getName()
        );
    }

    private StageDTO toStageDTO(Stage stage) {
        Language language = stage.getLanguage();
        return new StageDTO(
                stage.getId(),
                stage.getStageNumber(),
                stage.getName(),
                stage.getDescription(),
                language.getCode(),
                language.getName()
        );
    }

    private LevelDTO toLevelDTO(Level level) {
        Stage stage = level.getStage();
        Language language = stage.getLanguage();
        return new LevelDTO(
                level.getId(),
                level.getLevelNumber(),
                level.getTitle(),
                level.getDurationMinutes(),
                stage.getStageNumber(),
                stage.getName(),
                language.getCode()
        );
    }

    private SubLevelDTO toSubLevelDTO(SubLevel subLevel) {
        return new SubLevelDTO(
                subLevel.getId(),
                subLevel.getSubOrder(),
                subLevel.getTitle(),
                subLevel.getDurationMinutes(),
                subLevel.getContents().stream()
                        .sorted(Comparator.comparing(Content::getId, Comparator.nullsLast(Long::compareTo)))
                        .map(this::toContentDTO)
                        .toList(),
                subLevel.getAiQuestions().stream()
                        .sorted(Comparator.comparing(AIQuestion::getId, Comparator.nullsLast(Long::compareTo)))
                        .map(this::toAIQuestionDTO)
                        .toList()
        );
    }

    private ContentDTO toContentDTO(Content content) {
        return new ContentDTO(
                content.getId(),
                content.getContentText(),
                content.getContentType()
        );
    }

    private AIQuestionDTO toAIQuestionDTO(AIQuestion aiQuestion) {
        return new AIQuestionDTO(
                aiQuestion.getId(),
                aiQuestion.getQuestionText()
        );
    }

    private Comparator<Level> levelComparator() {
        return Comparator
                .comparing((Level level) -> level.getStage().getLanguage().getCode(), Comparator.nullsLast(String::compareToIgnoreCase))
                .thenComparing(level -> level.getStage().getStageNumber(), Comparator.nullsLast(Integer::compareTo))
                .thenComparing(Level::getLevelNumber, Comparator.nullsLast(Integer::compareTo));
    }
}
