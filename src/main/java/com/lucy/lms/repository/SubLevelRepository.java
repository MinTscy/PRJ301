package com.lucy.lms.repository;

import com.lucy.lms.entity.Level;
import com.lucy.lms.entity.SubLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubLevelRepository extends JpaRepository<SubLevel, Long> {

    Optional<SubLevel> findByLevelAndSubOrder(Level level, Integer subOrder);

    List<SubLevel> findByLevelOrderBySubOrderAsc(Level level);
}
