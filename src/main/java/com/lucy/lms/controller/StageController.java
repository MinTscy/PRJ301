package com.lucy.lms.controller;

import com.lucy.lms.dto.StageDTO;
import com.lucy.lms.service.LmsQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/stages")
@RequiredArgsConstructor
@Tag(name = "Stage API", description = "Stage lookup APIs.")
public class StageController {

    private final LmsQueryService lmsQueryService;

    @GetMapping
    @Operation(summary = "Get all stages")
    public List<StageDTO> getStages() {
        return lmsQueryService.getStages();
    }
}
