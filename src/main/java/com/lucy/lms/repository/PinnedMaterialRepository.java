package com.lucy.lms.repository;

import com.lucy.lms.entity.LiveRoom;
import com.lucy.lms.entity.PinnedMaterial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PinnedMaterialRepository extends JpaRepository<PinnedMaterial, Long> {

    List<PinnedMaterial> findByRoomOrderByPinnedOrderAscIdAsc(LiveRoom room);

    int countByRoom(LiveRoom room);
}
