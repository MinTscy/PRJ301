package com.lucy.lms.controller;

import com.lucy.lms.dto.LevelDTO;
import com.lucy.lms.dto.LevelDetailDTO;
import com.lucy.lms.dto.LanguageCoverageDTO;
import com.lucy.lms.service.DataCoverageService;
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
@RequestMapping("/api/levels")
@RequiredArgsConstructor
@Tag(name = "Level API", description = "Level lookup and level detail APIs.")
public class LevelController {

    private final LmsQueryService lmsQueryService;
    private final DataCoverageService dataCoverageService;

    @GetMapping
    @Operation(summary = "Get all levels")
    public List<LevelDTO> getLevels() {
        return lmsQueryService.getLevels();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get level by id")
    public LevelDTO getLevelById(@PathVariable Long id) {
        return lmsQueryService.getLevelById(id);
    }

    @GetMapping("/number/{levelNumber}")
    @Operation(summary = "Get levels by level number")
    public List<LevelDTO> getLevelsByNumber(@PathVariable Integer levelNumber) {
        return lmsQueryService.getLevelsByNumber(levelNumber);
    }

    @GetMapping("/coverage")
    @Operation(summary = "Get 100-level data coverage by language and stage")
    public List<LanguageCoverageDTO> getCoverage() {
        return dataCoverageService.getCoverage();
    }

    @GetMapping("/{id}/detail")
    @Operation(summary = "Get level detail by id")
    public LevelDetailDTO getLevelDetail(@PathVariable Long id) {
        return lmsQueryService.getLevelDetail(id);
    }
}
