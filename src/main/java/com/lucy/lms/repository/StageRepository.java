package com.lucy.lms.repository;

import com.lucy.lms.entity.Language;
import com.lucy.lms.entity.Stage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StageRepository extends JpaRepository<Stage, Long> {

    Optional<Stage> findByStageNumberAndLanguage(Integer stageNumber, Language language);
}
