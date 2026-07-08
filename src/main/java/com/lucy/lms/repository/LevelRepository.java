package com.lucy.lms.repository;

import com.lucy.lms.entity.Level;
import com.lucy.lms.entity.Stage;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LevelRepository extends JpaRepository<Level, Long> {

    Optional<Level> findByLevelNumberAndStage(Integer levelNumber, Stage stage);

    List<Level> findByLevelNumber(Integer levelNumber);

    List<Level> findByStage(Stage stage);

    List<Level> findByStageLanguageCode(String languageCode);

    @EntityGraph(attributePaths = {
            "stage",
            "stage.language"
    })
    @Query("""
            select l from Level l
            where upper(l.stage.language.code) = upper(:languageCode)
              and l.levelNumber = :levelNumber
            """)
    Optional<Level> findByLanguageCodeAndLevelNumber(
            @Param("languageCode") String languageCode,
            @Param("levelNumber") Integer levelNumber
    );

    @EntityGraph(attributePaths = {
            "stage",
            "stage.language"
    })
    @Query("select l from Level l where l.id = :id")
    Optional<Level> findDetailById(@Param("id") Long id);
}
