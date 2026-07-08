package com.lucy.lms.repository;

import com.lucy.lms.entity.LiveRoom;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface LiveRoomRepository extends JpaRepository<LiveRoom, Long> {

    @EntityGraph(attributePaths = {
            "level",
            "level.stage",
            "level.stage.language"
    })
    Optional<LiveRoom> findByRoomCode(String roomCode);

    @EntityGraph(attributePaths = {
            "level",
            "level.stage",
            "level.stage.language"
    })
    List<LiveRoom> findTop50ByStatusOrderByStartedAtDesc(String status);
}
