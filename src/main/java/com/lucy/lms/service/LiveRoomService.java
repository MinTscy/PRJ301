package com.lucy.lms.service;

import com.lucy.lms.dto.CreateLiveRoomRequestDTO;
import com.lucy.lms.dto.LiveRoomDTO;
import com.lucy.lms.dto.PinMaterialRequestDTO;
import com.lucy.lms.dto.PinnedMaterialDTO;
import com.lucy.lms.dto.RoomTimelineDTO;
import com.lucy.lms.entity.Level;
import com.lucy.lms.entity.LiveRoom;
import com.lucy.lms.entity.PinnedMaterial;
import com.lucy.lms.entity.Stage;
import com.lucy.lms.entity.SubLevel;
import com.lucy.lms.repository.LevelRepository;
import com.lucy.lms.repository.LiveRoomRepository;
import com.lucy.lms.repository.PinnedMaterialRepository;
import com.lucy.lms.repository.SubLevelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LiveRoomService {

    private static final String ACTIVE_STATUS = "ACTIVE";

    private final LiveRoomRepository liveRoomRepository;
    private final LevelRepository levelRepository;
    private final SubLevelRepository subLevelRepository;
    private final PinnedMaterialRepository pinnedMaterialRepository;
    private final RoomTimelineCalculator roomTimelineCalculator;
    private final RealtimeRoomEventPublisher realtimeRoomEventPublisher;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public LiveRoomDTO createSurvivalSpeakingRoom(CreateLiveRoomRequestDTO request) {
        if (request.levelNumber() < 1 || request.levelNumber() > 5) {
            throw new BadRequestException("Survival Speaking demo room only supports Level 1-5.");
        }

        return createRoom(request);
    }

    @Transactional
    public LiveRoomDTO createRoom(CreateLiveRoomRequestDTO request) {
        Level level = levelRepository.findByLanguageCodeAndLevelNumber(request.languageCode(), request.levelNumber())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Level " + request.levelNumber() + " not found for language code: " + request.languageCode()
                ));
        Instant now = Instant.now(clock);
        LiveRoom room = liveRoomRepository.save(LiveRoom.builder()
                .roomCode(generateRoomCode())
                .displayName(resolveDisplayName(request, level))
                .status(ACTIVE_STATUS)
                .anonymousMode(true)
                .startedAt(request.startedAt() == null ? now : request.startedAt())
                .createdAt(now)
                .level(level)
                .build());

        return toLiveRoomDTO(room);
    }

    @Transactional(readOnly = true)
    public LiveRoomDTO getRoom(String roomCode) {
        return toLiveRoomDTO(getRoomByCode(roomCode));
    }

    @Transactional(readOnly = true)
    public LiveRoomDTO getRoomById(Long roomId) {
        return toLiveRoomDTO(liveRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Live room not found with id: " + roomId)));
    }

    @Transactional(readOnly = true)
    public List<LiveRoomDTO> getActiveRooms() {
        return liveRoomRepository.findTop50ByStatusOrderByStartedAtDesc(ACTIVE_STATUS).stream()
                .map(this::toLiveRoomDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoomTimelineDTO getTimeline(String roomCode) {
        LiveRoom room = getRoomByCode(roomCode);
        List<SubLevel> subLevels = subLevelRepository.findByLevelOrderBySubOrderAsc(room.getLevel());
        return roomTimelineCalculator.calculate(room, subLevels, Instant.now(clock));
    }

    @Transactional
    public PinnedMaterialDTO pinMaterial(String roomCode, PinMaterialRequestDTO request) {
        LiveRoom room = getRoomByCode(roomCode);
        int order = request.pinnedOrder() == null
                ? pinnedMaterialRepository.countByRoom(room) + 1
                : request.pinnedOrder();

        PinnedMaterial material = pinnedMaterialRepository.save(PinnedMaterial.builder()
                .title(request.title().trim())
                .materialType(normalizeMaterialType(request.materialType()))
                .resourceUrl(request.resourceUrl().trim())
                .description(trimToNull(request.description()))
                .pinnedOrder(order)
                .pinnedAt(Instant.now(clock))
                .room(room)
                .build());

        PinnedMaterialDTO pinnedMaterial = toPinnedMaterialDTO(material);
        publishMaterialChangeAfterCommit(room.getRoomCode(), "PINNED", pinnedMaterial.id());
        return pinnedMaterial;
    }

    @Transactional(readOnly = true)
    public List<PinnedMaterialDTO> getPinnedMaterials(String roomCode) {
        LiveRoom room = getRoomByCode(roomCode);
        return pinnedMaterialRepository.findByRoomOrderByPinnedOrderAscIdAsc(room).stream()
                .map(this::toPinnedMaterialDTO)
                .toList();
    }

    @Transactional
    public void unpinMaterial(String roomCode, Long materialId) {
        LiveRoom room = getRoomByCode(roomCode);
        PinnedMaterial material = pinnedMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Pinned material not found with id: " + materialId));

        if (!material.getRoom().getId().equals(room.getId())) {
            throw new BadRequestException("Pinned material does not belong to room: " + roomCode);
        }

        pinnedMaterialRepository.delete(material);
        publishMaterialChangeAfterCommit(room.getRoomCode(), "UNPINNED", materialId);
    }

    private LiveRoom getRoomByCode(String roomCode) {
        String normalizedRoomCode = roomCode.trim().toUpperCase(Locale.ROOT);
        return liveRoomRepository.findByRoomCode(normalizedRoomCode)
                .orElseThrow(() -> new ResourceNotFoundException("Live room not found with code: " + roomCode));
    }

    private String generateRoomCode() {
        return "LUCY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String resolveDisplayName(CreateLiveRoomRequestDTO request, Level level) {
        if (request.displayName() != null && !request.displayName().isBlank()) {
            return request.displayName().trim();
        }

        return "Level " + level.getLevelNumber() + " - " + level.getTitle();
    }

    private String normalizeMaterialType(String materialType) {
        return materialType.trim().toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void publishMaterialChangeAfterCommit(String roomCode, String action, Long materialId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtimeRoomEventPublisher.publishMaterialsChanged(roomCode, action, materialId);
                }
            });
            return;
        }

        realtimeRoomEventPublisher.publishMaterialsChanged(roomCode, action, materialId);
    }

    private LiveRoomDTO toLiveRoomDTO(LiveRoom room) {
        Level level = room.getLevel();
        Stage stage = level.getStage();

        return new LiveRoomDTO(
                room.getId(),
                room.getRoomCode(),
                room.getDisplayName(),
                room.getStatus(),
                room.getAnonymousMode(),
                room.getStartedAt(),
                level.getId(),
                level.getLevelNumber(),
                level.getTitle(),
                stage.getStageNumber(),
                stage.getLanguage().getCode()
        );
    }

    private PinnedMaterialDTO toPinnedMaterialDTO(PinnedMaterial material) {
        return new PinnedMaterialDTO(
                material.getId(),
                material.getTitle(),
                material.getMaterialType(),
                material.getResourceUrl(),
                material.getDescription(),
                material.getPinnedOrder(),
                material.getPinnedAt()
        );
    }
}
