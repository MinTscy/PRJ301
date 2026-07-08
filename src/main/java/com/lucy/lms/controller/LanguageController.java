package com.lucy.lms.controller;

import com.lucy.lms.dto.LanguageDTO;
import com.lucy.lms.dto.LevelDTO;
import com.lucy.lms.service.LmsQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/languages")
@RequiredArgsConstructor
@Tag(name = "Language API", description = "Language lookup and language-scoped LMS content APIs.")
public class LanguageController {

    private final LmsQueryService lmsQueryService;

    @GetMapping
    @Operation(summary = "Get all languages")
    public List<LanguageDTO> getLanguages() {
        return lmsQueryService.getLanguages();
    }

    @GetMapping("/{code}/levels")
    @Operation(summary = "Get levels by language code")
    public List<LevelDTO> getLevelsByLanguage(@PathVariable String code) {
        return lmsQueryService.getLevelsByLanguageCode(code);
    }

    @GetMapping("/{code}/stages/{stageNumber}/levels")
    @Operation(summary = "Get levels by language code and stage number")
    public List<LevelDTO> getLevelsByLanguageAndStage(
            @PathVariable String code,
            @PathVariable Integer stageNumber
    ) {
        return lmsQueryService.getLevelsByLanguageCodeAndStageNumber(code, stageNumber);
    }
}
