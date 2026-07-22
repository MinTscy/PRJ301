package com.lucy.lms.controller;

import com.lucy.lms.dto.CreateLiveRoomRequestDTO;
import com.lucy.lms.dto.LiveRoomDTO;
import com.lucy.lms.dto.PinMaterialRequestDTO;
import com.lucy.lms.dto.PinnedMaterialDTO;
import com.lucy.lms.dto.RoomTimelineDTO;
import com.lucy.lms.service.LiveRoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Tag(name = "Room API", description = "Anonymous live room, pinned material, and timed LMS progression APIs.")
public class LiveRoomController {

    private final LiveRoomService liveRoomService;

    @PostMapping("/survival-speaking")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an anonymous Survival Speaking room for Level 1-5")
    public LiveRoomDTO createSurvivalSpeakingRoom(@Valid @RequestBody CreateLiveRoomRequestDTO request) {
        return liveRoomService.createSurvivalSpeakingRoom(request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an anonymous live room for a language level")
    public LiveRoomDTO createRoom(@Valid @RequestBody CreateLiveRoomRequestDTO request) {
        return liveRoomService.createRoom(request);
    }

    @GetMapping("/active")
    @Operation(summary = "List up to 50 active live rooms")
    public List<LiveRoomDTO> getActiveRooms() {
        return liveRoomService.getActiveRooms();
    }

    @GetMapping("/id/{roomId}")
    @Operation(summary = "Find a live room by numeric id")
    public LiveRoomDTO getRoomById(@PathVariable Long roomId) {
        return liveRoomService.getRoomById(roomId);
    }

    @GetMapping("/{roomCode}")
    @Operation(summary = "Get live room metadata by room code")
    public LiveRoomDTO getRoom(@PathVariable String roomCode) {
        return liveRoomService.getRoom(roomCode);
    }

    @GetMapping("/{roomCode}/timeline")
    @Operation(summary = "Get timed sub-level progression for Node.js or Mobile clients")
    public RoomTimelineDTO getTimeline(@PathVariable String roomCode) {
        return liveRoomService.getTimeline(roomCode);
    }

    @PostMapping("/{roomCode}/materials")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Pin a slide, document, or link to a live room")
    public PinnedMaterialDTO pinMaterial(
            @PathVariable String roomCode,
            @Valid @RequestBody PinMaterialRequestDTO request
    ) {
        return liveRoomService.pinMaterial(roomCode, request);
    }

    @GetMapping("/{roomCode}/materials")
    @Operation(summary = "Get pinned materials for a live room")
    public List<PinnedMaterialDTO> getPinnedMaterials(@PathVariable String roomCode) {
        return liveRoomService.getPinnedMaterials(roomCode);
    }

    @DeleteMapping("/{roomCode}/materials/{materialId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Unpin a material from a live room")
    public void unpinMaterial(@PathVariable String roomCode, @PathVariable Long materialId) {
        liveRoomService.unpinMaterial(roomCode, materialId);
    }

    @PostMapping("/{roomCode}/close")
    @Operation(summary = "Close a live room and update status to CLOSED")
    public LiveRoomDTO closeRoom(@PathVariable String roomCode) {
        return liveRoomService.closeRoom(roomCode);
    }
}
