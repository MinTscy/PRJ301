package com.lucy.lms.service;

import com.lucy.lms.dto.LanguageCoverageDTO;
import com.lucy.lms.entity.Language;
import com.lucy.lms.entity.Level;
import com.lucy.lms.entity.Stage;
import com.lucy.lms.repository.LanguageRepository;
import com.lucy.lms.repository.LevelRepository;
import com.lucy.lms.repository.StageRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DataCoverageServiceTest {

    @Test
    void getCoverageReportsMissingLevelsByStage() {
        LanguageRepository languageRepository = mock(LanguageRepository.class);
        StageRepository stageRepository = mock(StageRepository.class);
        LevelRepository levelRepository = mock(LevelRepository.class);
        DataCoverageService service = new DataCoverageService(languageRepository, stageRepository, levelRepository);

        Language english = Language.builder().id(1L).code("EN").name("ENGLISH").build();
        Stage stageOne = Stage.builder().id(10L).stageNumber(1).language(english).name("Stage 1").build();

        when(languageRepository.findAll()).thenReturn(List.of(english));
        when(stageRepository.findByStageNumberAndLanguage(1, english)).thenReturn(Optional.of(stageOne));
        when(stageRepository.findByStageNumberAndLanguage(2, english)).thenReturn(Optional.empty());
        when(stageRepository.findByStageNumberAndLanguage(3, english)).thenReturn(Optional.empty());
        when(levelRepository.findByStage(stageOne)).thenReturn(List.of(
                Level.builder().levelNumber(1).stage(stageOne).build(),
                Level.builder().levelNumber(2).stage(stageOne).build()
        ));

        LanguageCoverageDTO coverage = service.getCoverage().get(0);

        assertEquals("EN", coverage.languageCode());
        assertEquals(100, coverage.totalExpectedLevels());
        assertEquals(2, coverage.importedLevels());
        assertEquals(98, coverage.missingLevels());
        assertFalse(coverage.complete());
        assertEquals(List.of(3, 4, 5), coverage.stages().get(0).missingLevelNumbers().subList(0, 3));
        assertFalse(coverage.stages().get(1).stageExists());
    }
}
