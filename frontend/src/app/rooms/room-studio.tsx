"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  Activity,
  AlertTriangle,
  Bell,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Crown,
  Flame,
  Gift,
  Hand,
  Hash,
  Headphones,
  Heart,
  Mic,
  MicOff,
  MoreHorizontal,
  Pin,
  Podcast,
  Presentation,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  Signal,
  Square,
  Star,
  Users,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import type { AuthUser, GiftCatalogItem, GiftEvent, Language, Level, LiveRoom, PinnedMaterial, PodcastRecording, RoomTimeline } from "@/lib/api";
import { API_BASE_URL, walletApi } from "@/lib/api";
import { AUTH_SESSION_EVENT, readStoredUser } from "@/lib/auth-session";
import { getCefrBand } from "@/lib/design-system";
import {
  createRealtimeSocket,
  realtimeApi,
  type RealtimeAck,
  type RealtimeParticipant,
  type RealtimeRoomState
} from "@/lib/realtime";
import { useAgoraAudio } from "@/lib/use-agora-audio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

type RoomStudioProps = {
  languages: Language[];
  initialLevels: Level[];
  initialLanguage: string;
};

const giftIcons: Record<string, typeof Gift> = {
  APPLAUSE: Gift,
  COFFEE: Heart,
  STAR: Star,
  ROCKET: Flame,
  CROWN: Crown
};

const LEARNER_ANONYMOUS_KEY = "lucy.room.learnerAnonymous";
const ANONYMOUS_PERSONA_KEY = "lucy.anonymousPersona";
const ANONYMOUS_DISPLAY_NAME_KEY = "lucy.anonymousDisplayName";

function readLearnerAnonymousPreference() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(LEARNER_ANONYMOUS_KEY) !== "false";
}

function writeLearnerAnonymousPreference(anonymous: boolean) {
  window.localStorage.setItem(LEARNER_ANONYMOUS_KEY, anonymous ? "true" : "false");
}

function createAnonymousPersonaId() {
  return `anonymous_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
}

function readAnonymousIdentity() {
  const personaId =
    window.sessionStorage.getItem(ANONYMOUS_PERSONA_KEY) ?? createAnonymousPersonaId();
  window.sessionStorage.setItem(ANONYMOUS_PERSONA_KEY, personaId);

  const suffix = personaId.replace(/^anonymous_/, "").replace(/-/g, "").slice(0, 4).toUpperCase();
  const displayName =
    window.sessionStorage.getItem(ANONYMOUS_DISPLAY_NAME_KEY) ?? `Anonymous Learner ${suffix}`;
  window.sessionStorage.setItem(ANONYMOUS_DISPLAY_NAME_KEY, displayName);

  return { personaId, displayName };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers);
  
  // Only add Content-Type for requests with a body
  if (method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function participantInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length ? parts.map((part) => part[0]?.toUpperCase()).join("") : "?";
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="mt-4 flex h-4 items-end justify-center gap-1">
      {[8, 14, 10, 16, 7].map((height, index) => (
        <span
          key={index}
          className={`w-1 rounded-full ${
            active ? "audio-wave-bar bg-emerald-400" : "bg-white/20"
          }`}
          style={{ height, animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}

function qualityLabel(value?: number) {
  if (!value) return "Unknown";
  if (value <= 2) return "Good";
  if (value === 3) return "Fair";
  if (value === 4) return "Weak";
  return "Poor";
}

function qualityTone(value?: number) {
  if (!value) return "text-muted-foreground";
  if (value <= 2) return "text-emerald-300";
  if (value === 3) return "text-amber-300";
  return "text-red-300";
}

function audioWarningText(warning: ReturnType<typeof useAgoraAudio>["warning"]) {
  if (warning === "microphone-ended") return "Microphone stopped. Reconnect the device or allow browser permission again.";
  if (warning === "no-microphone-signal") return "Microphone is open, but no voice signal is detected.";
  if (warning === "poor-network") return "Agora reports weak network quality. Audio may stutter.";
  if (warning === "reconnecting") return "Agora is reconnecting audio.";
  if (warning === "muted-while-speaking") return "You appear to be speaking while muted.";
  return null;
}

function formatRecordingElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function recorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

function SpeakerTile({
  participant,
  speaking,
  audioConnected
}: {
  participant: RealtimeParticipant;
  speaking: boolean;
  audioConnected: boolean;
}) {
  const tier =
    participant.accountRole === "LUCY_SUPER"
      ? "super"
      : participant.accountRole === "LUCY_PRO"
        ? "pro"
        : null;

  return (
    <div className="participant-enter grid min-h-36 place-items-center text-center">
      <div className="relative">
        <div
          className={`grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-xl font-black text-white transition-all duration-300 ${
            speaking ? "scale-105 ring-4 ring-emerald-500 shadow-[0_0_30px_rgba(52,211,153,0.35)]" : ""
          }`}
        >
          {participantInitials(participant.displayName)}
        </div>
        {audioConnected && !participant.micMuted ? (
          <span className="absolute bottom-1 right-0 size-3.5 rounded-full border-2 border-background bg-emerald-400" />
        ) : null}
        {participant.micMuted ? (
          <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border-2 border-background bg-red-500">
            <MicOff className="size-3 text-white" />
          </span>
        ) : null}
      </div>
      <div>
        <div className="mt-3 text-sm font-black text-white">{participant.displayName}</div>
        {tier ? (
          <Badge className="mt-2" variant={tier === "super" ? "coral" : "violet"}>
            {tier === "super" ? "Super" : "Pro"}
          </Badge>
        ) : null}
        <Waveform active={speaking && !participant.micMuted} />
      </div>
    </div>
  );
}

export function RoomStudio({ languages, initialLevels, initialLanguage }: RoomStudioProps) {
  const [language, setLanguage] = useState(initialLanguage);
  const [stage, setStage] = useState(1);
  const [levels, setLevels] = useState(initialLevels);
  const [levelId, setLevelId] = useState(initialLevels[0]?.id ?? 0);
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [timeline, setTimeline] = useState<RoomTimeline | null>(null);
  const [materials, setMaterials] = useState<PinnedMaterial[]>([]);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialType, setMaterialType] = useState("SLIDE");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeState, setRealtimeState] = useState<RealtimeRoomState | null>(null);
  const [currentPersonaId, setCurrentPersonaId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [learnerAnonymous, setLearnerAnonymous] = useState(true);
  const [roomSearch, setRoomSearch] = useState("");
  const [roomSearchResult, setRoomSearchResult] = useState<LiveRoom | null>(null);
  const [roomSearchLoading, setRoomSearchLoading] = useState(false);
  const [giftCatalog, setGiftCatalog] = useState<GiftCatalogItem[]>([]);
  const [sendingGiftCode, setSendingGiftCode] = useState<string | null>(null);
  const [giftNotice, setGiftNotice] = useState<{ kind: "sent" | "received"; message: string } | null>(null);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "starting" | "recording" | "publishing" | "published">("idle");
  const [recordingTitle, setRecordingTitle] = useState("");
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const [recordingMessage, setRecordingMessage] = useState<string | null>(null);
  const [publishedPodcast, setPublishedPodcast] = useState<PodcastRecording | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingIdRef = useRef<string | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  const selectedLevel = useMemo(() => levels.find((item) => item.id === levelId) ?? levels[0], [levels, levelId]);
  const band = getCefrBand(selectedLevel?.levelNumber);
  const progress = timeline?.steps.length
    ? Math.min(100, Math.round((timeline.elapsedMinutes / timeline.steps[timeline.steps.length - 1].endMinute) * 100))
    : 0;
  const roomTitle = room?.displayName ?? "Morning English Chat";
  const roomTopic = room?.levelTitle ?? selectedLevel?.title ?? "Weekend plans & daily routines";
  const activeMaterial = useMemo(
    () => materials.find((item) => item.id === activeMaterialId) ?? materials[0] ?? null,
    [activeMaterialId, materials]
  );
  const raisedHands = realtimeState?.participants.filter((participant) => participant.handRaised) ?? [];
  const currentParticipant = realtimeState?.participants.find(
    (participant) => participant.personaId === currentPersonaId
  );
  const participants = realtimeState?.participants ?? [];
  const onStageParticipants = participants.filter(
    (participant) => participant.participantRole !== "audience"
  );
  const audienceParticipants = participants.filter(
    (participant) => participant.participantRole === "audience"
  );
  const hostParticipant = participants.find((participant) => participant.participantRole === "moderator") ?? null;
  const canModerate =
    currentParticipant?.accountRole === "LUCY_PRO" || currentParticipant?.accountRole === "LUCY_SUPER";
  const canCreateRoom = authUser?.role === "LUCY_PRO" || authUser?.role === "LUCY_SUPER";
  const canRecordPodcast = authUser?.role === "LUCY_SUPER";
  const isLearner = authUser?.role === "LUCY";
  const activeRoomIdentity =
    currentParticipant?.displayName ?? (learnerAnonymous ? "Anonymous Learner" : authUser?.displayName ?? "Learner");
  const defaultRecordingTitle = `${room?.levelTitle ?? selectedLevel?.title ?? "Live room"} recap`;
  const audio = useAgoraAudio({
    roomCode: room?.roomCode,
    personaId: currentPersonaId ?? undefined,
    participantRole: currentParticipant?.participantRole,
    micMuted: isMuted,
    accessToken
  });
  const canSpeak = Boolean(currentParticipant && currentParticipant.participantRole !== "audience");
  const audioStatusLabel =
    audio.status === "connected"
      ? audio.connectionState === "RECONNECTING"
        ? "Audio reconnecting"
        : `${audio.remoteAudioUids.size} audio streams`
      : audio.status === "unavailable"
        ? "Agora not configured"
        : audio.status === "connecting"
          ? "Audio connecting"
          : "Enable audio";
  const audioWarning = audioWarningText(audio.warning);
  const uplinkQuality = audio.networkQuality?.uplinkNetworkQuality;
  const downlinkQuality = audio.networkQuality?.downlinkNetworkQuality;

  useEffect(() => {
    setAuthUser(readStoredUser());
    setLearnerAnonymous(readLearnerAnonymousPreference());
    const token = window.localStorage.getItem("lucy.accessToken");
    if (token) {
      void walletApi.giftCatalog(token).then(setGiftCatalog).catch(() => setGiftCatalog([]));
    }

    const handleSession = (event: Event) => {
      setAuthUser((event as CustomEvent<AuthUser | null>).detail ?? readStoredUser());
    };
    window.addEventListener(AUTH_SESSION_EVENT, handleSession);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, handleSession);
  }, []);

  useEffect(() => {
    async function loadLevels() {
      try {
        const data = await request<Level[]>(`/api/languages/${language}/stages/${stage}/levels`);
        setLevels(data);
        setLevelId((current) => data.some((item) => item.id === current) ? current : (data[0]?.id ?? 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load levels");
        setLevels([]);
      }
    }

    loadLevels();
  }, [language, stage]);

  useEffect(() => {
    if (!room) return;

    const socket = createRealtimeSocket();
    socketRef.current = socket;
    const accessToken = window.localStorage.getItem("lucy.accessToken") ?? undefined;
    setAccessToken(accessToken);
    const activeUser = authUser ?? readStoredUser();
    const shouldUseAnonymous = !activeUser || (activeUser.role === "LUCY" && learnerAnonymous);
    const anonymousIdentity = readAnonymousIdentity();
    const personaId = shouldUseAnonymous ? anonymousIdentity.personaId : activeUser.personaId;
    const displayName = shouldUseAnonymous ? anonymousIdentity.displayName : activeUser.displayName;
    setCurrentPersonaId(personaId);

    socket.on("connect", () => {
      setRealtimeConnected(true);
      socket.emit(
        "room:join",
        {
          roomCode: room.roomCode,
          personaId,
          displayName,
          accessToken,
          anonymous: shouldUseAnonymous
        },
        (ack: RealtimeAck) => {
          if (ack.ok && ack.state) {
            setRealtimeState(ack.state);
          } else if (ack.error) {
            setError(ack.error);
          }
        }
      );
    });
    socket.on("disconnect", () => setRealtimeConnected(false));
    socket.on("room:state", (state: RealtimeRoomState) => setRealtimeState(state));
    socket.on("timeline:updated", (nextTimeline: RoomTimeline) => setTimeline(nextTimeline));
    socket.on("stage:changed", (payload: { currentStep: RoomTimeline["currentStep"] }) => {
      setTimeline((current) =>
        current ? { ...current, currentStep: payload.currentStep } : current
      );
    });
    socket.on("realtime:error", (payload: { message: string }) => setError(payload.message));
    socket.on("gift:received", (gift: GiftEvent) => {
      if (gift.recipientPersonaId === personaId) {
        setGiftNotice({
          kind: "received",
          message: `You received ${gift.value.toLocaleString("en-US")} Lucy Points from ${gift.senderDisplayName}.`
        });
      } else if (gift.senderPersonaId === personaId) {
        setGiftNotice({
          kind: "sent",
          message: `You sent ${gift.giftName} worth ${gift.value.toLocaleString("en-US")} Lucy Points to the room host.`
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setRealtimeConnected(false);
      setRealtimeState(null);
      setAccessToken(undefined);
      setCurrentPersonaId(null);
    };
  }, [authUser, learnerAnonymous, room]);

  useEffect(() => {
    if (audio.status === "error" && audio.error) setError(audio.error);
    if (audio.deviceError) setError(audio.deviceError);
  }, [audio.deviceError, audio.error, audio.status]);

  useEffect(() => {
    if (!currentParticipant) return;
    setIsMuted(currentParticipant.micMuted);
    setHandRaised(currentParticipant.handRaised);
  }, [currentParticipant]);

  useEffect(() => {
    if (recordingStatus !== "recording") return;
    const timer = window.setInterval(() => {
      const startedAt = recordingStartedAtRef.current;
      if (startedAt) {
        setRecordingElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recordingStatus]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      stopRecordingStream();
    };
  }, []);

  function stopRecordingStream() {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  }

  async function startSuperRecording() {
    const token = accessToken ?? window.localStorage.getItem("lucy.accessToken") ?? undefined;
    if (!room || !token || !canRecordPodcast) {
      setError("Only a signed-in Super account can record a room podcast.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser does not support in-room audio recording.");
      return;
    }
    if (recordingStatus === "recording" || recordingStatus === "starting") return;

    setError(null);
    setRecordingMessage(null);
    setPublishedPodcast(null);
    setRecordingStatus("starting");

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const title = recordingTitle.trim() || defaultRecordingTitle;
      const recording = await realtimeApi.startRecording(token, {
        roomCode: room.roomCode,
        title
      });
      const mimeType = recorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordingIdRef.current = recording.id;
      recordingStartedAtRef.current = Date.now();
      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setRecordingTitle(title);
      setRecordingElapsedSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void publishStoppedRecording();
      };
      recorder.start(1000);
      setRecordingStatus("recording");
      setRecordingMessage("Recording started. Stop when this room recap is ready to publish.");
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      setRecordingStatus("idle");
      setError(err instanceof Error ? err.message : "Unable to start recording.");
    }
  }

  function stopSuperRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setRecordingStatus("publishing");
    setRecordingElapsedSeconds(
      recordingStartedAtRef.current
        ? Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
        : recordingElapsedSeconds
    );
    recorder.stop();
  }

  async function publishStoppedRecording() {
    const token = accessToken ?? window.localStorage.getItem("lucy.accessToken") ?? undefined;
    const recordingId = recordingIdRef.current;
    const startedAt = recordingStartedAtRef.current;
    const chunks = recordingChunksRef.current;
    const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";

    stopRecordingStream();
    mediaRecorderRef.current = null;
    recordingIdRef.current = null;
    recordingStartedAtRef.current = null;
    recordingChunksRef.current = [];

    if (!token || !recordingId) {
      setRecordingStatus("idle");
      setError("Recording session is missing authentication. Please sign in again.");
      return;
    }
    if (chunks.length === 0) {
      setRecordingStatus("idle");
      setError("Recording did not capture any audio.");
      return;
    }

    setRecordingStatus("publishing");
    setError(null);
    setRecordingMessage("Uploading audio and publishing podcast...");
    try {
      const audioBlob = new Blob(chunks, { type: mimeType });
      const durationSeconds = startedAt
        ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
        : Math.max(1, recordingElapsedSeconds);
      const podcast = await realtimeApi.uploadRecordingAudio(token, recordingId, audioBlob, durationSeconds);
      setPublishedPodcast(podcast);
      setRecordingStatus("published");
      setRecordingMessage("Podcast published. Learners can now replay it from the Podcast library.");
    } catch (err) {
      setRecordingStatus("idle");
      setError(err instanceof Error ? err.message : "Unable to publish podcast recording.");
    }
  }

  async function createRoom() {
    if (!selectedLevel) return;
    setError(null);
    const path =
      selectedLevel.levelNumber >= 1 && selectedLevel.levelNumber <= 5
        ? "/api/rooms/survival-speaking"
        : "/api/rooms";

    try {
      const created = await request<LiveRoom>(path, {
        method: "POST",
        body: JSON.stringify({
          languageCode: selectedLevel.languageCode,
          levelNumber: selectedLevel.levelNumber,
          displayName: `${selectedLevel.languageCode} Level ${selectedLevel.levelNumber}`
        })
      });
      setRoom(created);
      await refreshRoom(created.roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create room");
    }
  }

  async function searchForRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = roomSearch.trim();
    if (!query) return;

    setRoomSearchLoading(true);
    setRoomSearchResult(null);
    setError(null);
    try {
      const found = /^\d+$/.test(query)
        ? await request<LiveRoom>(`/api/rooms/id/${query}`)
        : await request<LiveRoom>(`/api/rooms/${encodeURIComponent(query.toUpperCase())}`);
      setRoomSearchResult(found);
    } catch {
      setError(`No room was found for “${query}”. Check the room ID or code and try again.`);
    } finally {
      setRoomSearchLoading(false);
    }
  }

  async function joinRoom(targetRoom: LiveRoom) {
    if (targetRoom.status !== "ACTIVE") {
      setError("This room is no longer active.");
      return;
    }

    setError(null);
    setLanguage(targetRoom.languageCode);
    setStage(targetRoom.stageNumber);
    setLevelId(targetRoom.levelId);
    setRoom(targetRoom);
    await refreshRoom(targetRoom.roomCode);
  }

  function leaveRoom() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      stopSuperRecording();
    }
    setRoom(null);
    setTimeline(null);
    setMaterials([]);
    setActiveMaterialId(null);
    setError(null);
    setGiftNotice(null);
  }

  function updateLearnerIdentityMode(anonymous: boolean) {
    if (!isLearner || learnerAnonymous === anonymous) return;
    writeLearnerAnonymousPreference(anonymous);
    setLearnerAnonymous(anonymous);
    setGiftNotice(null);
    setError(null);
    setHandRaised(false);
  }

  async function sendGift(gift: GiftCatalogItem) {
    const token = accessToken ?? window.localStorage.getItem("lucy.accessToken") ?? undefined;
    if (!room || !token || !hostParticipant || !isLearner) {
      setError("Join an active room as a learner while the host is present before sending a gift.");
      return;
    }

    setSendingGiftCode(gift.code);
    setGiftNotice(null);
    setError(null);
    try {
      const response = await walletApi.sendGift(token, {
        roomCode: room.roomCode,
        giftCode: gift.code,
        recipientPersonaId: hostParticipant.personaId
      });
      setGiftNotice({
        kind: "sent",
        message: `Gift sent to ${hostParticipant.displayName}. Your balance is ${response.balance.toLocaleString("en-US")} Lucy Points.`
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send this gift.");
    } finally {
      setSendingGiftCode(null);
    }
  }

  async function refreshRoom(roomCode = room?.roomCode) {
    if (!roomCode) return;
    const [nextTimeline, nextMaterials] = await Promise.all([
      request<RoomTimeline>(`/api/rooms/${roomCode}/timeline`),
      request<PinnedMaterial[]>(`/api/rooms/${roomCode}/materials`)
    ]);
    setTimeline(nextTimeline);
    setMaterials(nextMaterials);
    setActiveMaterialId((current) => current ?? nextMaterials[0]?.id ?? null);
  }

  async function pinMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!room || !materialTitle || !materialUrl) return;

    await request<PinnedMaterial>(`/api/rooms/${room.roomCode}/materials`, {
      method: "POST",
      body: JSON.stringify({
        title: materialTitle,
        materialType,
        resourceUrl: materialUrl,
        description: materialDescription
      })
    });
    setMaterialTitle("");
    setMaterialUrl("");
    setMaterialDescription("");
    await refreshRoom(room.roomCode);
  }

  async function unpinMaterial(materialId: number) {
    if (!room) return;
    await request<void>(`/api/rooms/${room.roomCode}/materials/${materialId}`, {
      method: "DELETE"
    });
    if (activeMaterialId === materialId) {
      setActiveMaterialId(null);
    }
    await refreshRoom(room.roomCode);
  }

  function toggleMic() {
    const nextMuted = !isMuted;
    if (!nextMuted && !canSpeak) {
      setError("Raise your hand and wait for moderator approval before enabling the microphone.");
      return;
    }
    if (!socketRef.current || !room) {
      setIsMuted(nextMuted);
      return;
    }
    socketRef.current.emit("mic:set", { muted: nextMuted }, (ack: RealtimeAck) => {
      if (ack.ok) {
        setIsMuted(nextMuted);
      } else {
        setError(ack.error ?? "Unable to change microphone state");
      }
    });
  }

  function toggleHand() {
    const nextRaised = !handRaised;
    if (!socketRef.current || !room) {
      setHandRaised(nextRaised);
      return;
    }
    socketRef.current.emit(nextRaised ? "hand:raise" : "hand:lower", {}, (ack: RealtimeAck) => {
      if (ack.ok) {
        setHandRaised(nextRaised);
      } else {
        setError(ack.error ?? "Unable to change hand state");
      }
    });
  }

  async function prepareBrowserAudio() {
    setError(null);
    audio.enableAudioPlayback();
    if (canSpeak) {
      await audio.requestMicrophoneAccess();
    } else {
      await audio.refreshDevices();
    }
  }

  function approveSpeaker(participant: RealtimeParticipant) {
    if (!socketRef.current || !room) return;
    socketRef.current.emit(
      "moderation:approve-speaker",
      { roomCode: room.roomCode, personaId: participant.personaId },
      (ack: RealtimeAck) => {
        if (!ack.ok) setError(ack.error ?? "Unable to approve speaker");
      }
    );
  }

  function moveToAudience(participant: RealtimeParticipant) {
    if (!socketRef.current || !room) return;
    socketRef.current.emit(
      "moderation:move-to-audience",
      { roomCode: room.roomCode, personaId: participant.personaId },
      (ack: RealtimeAck) => {
        if (!ack.ok) setError(ack.error ?? "Unable to move participant to audience");
      }
    );
  }

  function materialIcon(type: string) {
    if (type === "SLIDE") return Presentation;
    if (type === "DOCUMENT") return FileText;
    return ExternalLink;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-20 items-center justify-between border-b border-white/[0.06] px-5 md:px-10">
        <div>
          <h1 className="text-2xl font-black text-white">Live Room</h1>
          {room ? (
            <p className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              {room.roomCode}
              <span className={`size-2 rounded-full ${realtimeConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
              {realtimeConnected ? "Realtime connected" : "Realtime connecting"}
            </p>
          ) : null}
        </div>
        <button className="relative grid size-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-white">
          <Bell className="size-5" />
          <span className="absolute right-3 top-2 size-2 rounded-full bg-primary" />
        </button>
      </header>

      <main className="px-5 py-7 md:px-10">
        <section className="mb-7 rounded-3xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Room discovery</p>
              <h2 className="mt-2 text-2xl font-black text-white">Find an active room</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Search by numeric room ID or room code, then join as a learner audience member.
              </p>
            </div>
            <form className="flex w-full max-w-xl gap-2" onSubmit={searchForRoom}>
              <div className="relative min-w-0 flex-1">
                <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-11 pl-9"
                  value={roomSearch}
                  onChange={(event) => setRoomSearch(event.target.value)}
                  placeholder="Room ID or LUCY-XXXXXXXX"
                />
              </div>
              <Button className="h-11" type="submit" disabled={roomSearchLoading || !roomSearch.trim()}>
                <Search className="size-4" /> {roomSearchLoading ? "Searching..." : "Search"}
              </Button>
              <Button
                className="h-11"
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  setRoomSearch("");
                  setRoomSearchResult(null);
                  setError(null);
                }}
                aria-label="Clear room search"
              >
                <RefreshCw className="size-4" />
              </Button>
            </form>
          </div>

          {error && !room ? (
            <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>
          ) : null}

          {roomSearchResult ? (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={roomSearchResult.status === "ACTIVE" ? "teal" : "outline"}>{roomSearchResult.status}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">ID {roomSearchResult.id} · {roomSearchResult.roomCode}</span>
                </div>
                <div className="mt-2 font-black text-white">{roomSearchResult.displayName}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {roomSearchResult.languageCode} · Level {roomSearchResult.levelNumber} · Stage {roomSearchResult.stageNumber}
                </p>
              </div>
              <Button onClick={() => joinRoom(roomSearchResult)} disabled={roomSearchResult.status !== "ACTIVE"}>
                <Radio className="size-4" /> {isLearner ? "Join room" : "Open room"}
              </Button>
            </div>
          ) : null}
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-950 p-6 shadow-panel">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="violet">{language}</Badge>
                <Badge className="bg-red-500 text-white" variant="default">LIVE</Badge>
                <span className="text-sm font-black text-violet-200">
                  {band?.key ?? "B2"} Level
                </span>
              </div>
              <MoreHorizontal className="size-5 text-white/60" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-white md:text-3xl">{roomTitle}</h2>
            <p className="mt-2 text-base font-medium text-violet-100">{roomTopic}</p>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-sm font-medium text-violet-100/80">
              <span className="flex items-center gap-1.5">
                <Users className="size-4" />
                {audienceParticipants.length} listening
              </span>
              <span className="flex items-center gap-1.5">
                <Mic className="size-4" />
                {onStageParticipants.length} on stage
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-4" />
                {timeline?.elapsedMinutes ?? 0} min
              </span>
              <button
                type="button"
                onClick={prepareBrowserAudio}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 transition-colors hover:bg-white/15"
              >
                {audio.status === "connected" ? (
                  <Volume2 className="size-4 text-emerald-300" />
                ) : (
                  <VolumeX className="size-4 text-amber-300" />
                )}
                {audioStatusLabel}
              </button>
              <button
                type="button"
                onClick={() => setAudioPanelOpen((open) => !open)}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 transition-colors hover:bg-white/15"
                aria-expanded={audioPanelOpen}
              >
                <Settings2 className="size-4" />
                Devices
              </button>
            </div>
          </div>
        </section>

        {room && audioPanelOpen ? (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Agora Audio</p>
                <h3 className="mt-2 text-lg font-black text-white">{audioStatusLabel}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-muted-foreground">
                    <Signal className="size-3.5" /> {audio.connectionState}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 ${qualityTone(uplinkQuality)}`}>
                    Up {qualityLabel(uplinkQuality)}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 ${qualityTone(downlinkQuality)}`}>
                    Down {qualityLabel(downlinkQuality)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-muted-foreground">
                    <Mic className="size-3.5" /> {audio.microphonePermission}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={prepareBrowserAudio}>
                  <Volume2 className="size-4" /> Enable
                </Button>
                <Button type="button" variant="outline" onClick={() => audio.refreshDevices()}>
                  <RefreshCw className="size-4" /> Refresh
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_280px]">
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Microphone
                <div className="relative">
                  <Mic className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    className="h-11 w-full rounded-2xl border border-white/10 bg-[#111827] px-9 text-sm text-white"
                    value={audio.selectedMicrophoneId}
                    onChange={(event) => audio.setSelectedMicrophoneId(event.target.value)}
                    disabled={!canSpeak || audio.microphones.length === 0}
                  >
                    {audio.microphones.length === 0 ? (
                      <option value="">No microphone found</option>
                    ) : (
                      audio.microphones.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                      ))
                    )}
                  </select>
                </div>
              </label>

              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Speaker
                <div className="relative">
                  <Headphones className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    className="h-11 w-full rounded-2xl border border-white/10 bg-[#111827] px-9 text-sm text-white"
                    value={audio.selectedPlaybackDeviceId}
                    onChange={(event) => audio.setSelectedPlaybackDeviceId(event.target.value)}
                    disabled={audio.playbackDevices.length === 0}
                  >
                    {audio.playbackDevices.length === 0 ? (
                      <option value="">Default speaker</option>
                    ) : (
                      audio.playbackDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                      ))
                    )}
                  </select>
                </div>
              </label>

              <div className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Mic signal
                <div className="flex h-11 items-center gap-3 rounded-2xl border border-white/10 bg-[#111827] px-3">
                  <Activity className={`size-4 ${audio.microphonePublished ? "text-emerald-300" : "text-muted-foreground"}`} />
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, audio.localVolumeLevel)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[11px] text-white">{Math.round(audio.localVolumeLevel)}</span>
                </div>
              </div>
            </div>

            {audioWarning ? (
              <p className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {audioWarning}
              </p>
            ) : null}

            {audio.deviceError ? (
              <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                {audio.deviceError}
              </p>
            ) : null}
          </section>
        ) : null}

        {room && isLearner ? (
          <section className="mt-5 rounded-3xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Learner Identity</p>
                <h3 className="mt-2 text-lg font-black text-white">
                  {learnerAnonymous ? "Anonymous in this room" : "Showing your profile name"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Current room name: <span className="font-bold text-white">{activeRoomIdentity}</span>
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                {learnerAnonymous ? (
                  <EyeOff className="size-5 text-emerald-300" />
                ) : (
                  <Eye className="size-5 text-violet-300" />
                )}
                <span className="text-sm font-black text-white">Anonymous</span>
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={learnerAnonymous}
                  onChange={(event) => updateLearnerIdentityMode(event.target.checked)}
                />
                <span className={`relative h-6 w-11 rounded-full transition-colors ${learnerAnonymous ? "bg-emerald-500" : "bg-white/15"}`}>
                  <span className={`absolute left-1 top-1 size-4 rounded-full bg-white transition-transform ${learnerAnonymous ? "translate-x-5" : ""}`} />
                </span>
              </label>
            </div>
          </section>
        ) : null}

        {canCreateRoom ? (
        <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.025] p-4">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_1.1fr_1.8fr_auto]">
            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
              Language
              <select className="h-11 rounded-2xl border border-white/10 bg-[#111827] px-3 text-sm text-white" value={language} onChange={(event) => setLanguage(event.target.value)}>
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>{item.code} - {item.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
              Stage
              <select className="h-11 rounded-2xl border border-white/10 bg-[#111827] px-3 text-sm text-white" value={stage} onChange={(event) => setStage(Number(event.target.value))}>
                <option value={1}>Stage 1</option>
                <option value={2}>Stage 2</option>
                <option value={3}>Stage 3</option>
              </select>
            </label>
            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
              Level
              <select className="h-11 rounded-2xl border border-white/10 bg-[#111827] px-3 text-sm text-white" value={levelId} onChange={(event) => setLevelId(Number(event.target.value))}>
                {levels.map((item) => (
                  <option key={item.id} value={item.id}>{item.levelNumber} - {item.title}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <Button className="h-11" onClick={createRoom} disabled={!selectedLevel}>
                <Radio className="size-4" /> Launch
              </Button>
              <Button className="h-11" size="icon" variant="outline" onClick={() => refreshRoom()} disabled={!room}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>
          {error && room ? <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
        </section>
        ) : null}

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">On Stage</p>
            <Badge variant="outline">{onStageParticipants.length} live</Badge>
          </div>
          {onStageParticipants.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-muted-foreground">
              No one is on stage yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {onStageParticipants.map((participant) => (
                <div key={participant.socketId} className="relative">
                  <SpeakerTile
                    participant={participant}
                    speaking={audio.speakingUids.has(participant.agoraUid)}
                    audioConnected={
                      participant.personaId === currentPersonaId
                        ? audio.status === "connected"
                        : audio.remoteAudioUids.has(participant.agoraUid)
                    }
                  />
                  {canModerate &&
                  participant.participantRole === "speaker" &&
                  participant.personaId !== currentPersonaId ? (
                    <button
                      type="button"
                      onClick={() => moveToAudience(participant)}
                      className="absolute right-3 top-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-bold text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-200"
                    >
                      Move down
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {canModerate ? (
          <section className="mt-8 rounded-3xl border border-violet-500/25 bg-violet-500/[0.07] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Pro Dashboard</p>
                <h3 className="mt-2 text-lg font-black text-white">Raised hand queue</h3>
              </div>
              <Badge variant="violet">{raisedHands.length} waiting</Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {raisedHands.length === 0 ? (
                <p className="text-sm text-muted-foreground">No learner is waiting to speak.</p>
              ) : (
                raisedHands.map((participant) => (
                  <div key={participant.personaId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div>
                      <div className="font-bold text-white">{participant.displayName}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{participant.personaId}</div>
                    </div>
                    <Button type="button" size="sm" onClick={() => approveSpeaker(participant)}>
                      Approve speaker
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}

        {room && canRecordPodcast ? (
          <section className="mt-8 rounded-3xl border border-emerald-500/25 bg-emerald-500/[0.07] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Super Recorder</p>
                <h3 className="mt-2 flex items-center gap-2 text-lg font-black text-white">
                  <Podcast className="size-5 text-emerald-300" />
                  Record this room as a podcast
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Capture your microphone audio, publish it to the realtime podcast store, and let learners replay it after class.
                </p>
              </div>
              <Badge variant={recordingStatus === "recording" ? "coral" : recordingStatus === "published" ? "teal" : "outline"}>
                {recordingStatus === "recording"
                  ? `Recording ${formatRecordingElapsed(recordingElapsedSeconds)}`
                  : recordingStatus === "publishing"
                    ? "Publishing"
                    : recordingStatus === "published"
                      ? "Published"
                      : "Ready"}
              </Badge>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Episode title
                <Input
                  value={recordingTitle}
                  onChange={(event) => setRecordingTitle(event.target.value)}
                  placeholder={defaultRecordingTitle}
                  disabled={recordingStatus === "recording" || recordingStatus === "publishing"}
                />
              </label>
              <div className="flex items-end gap-2">
                {recordingStatus === "recording" ? (
                  <Button type="button" variant="destructive" className="h-10" onClick={stopSuperRecording}>
                    <Square className="size-4" />
                    Stop and publish
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-10"
                    onClick={startSuperRecording}
                    disabled={recordingStatus === "starting" || recordingStatus === "publishing"}
                  >
                    <Podcast className="size-4" />
                    {recordingStatus === "starting" ? "Starting..." : "Record"}
                  </Button>
                )}
                <Button asChild type="button" variant="outline" className="h-10">
                  <a href={`/podcasts?roomCode=${encodeURIComponent(room.roomCode)}`}>
                    Listen back
                  </a>
                </Button>
              </div>
            </div>

            {recordingMessage ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">
                {recordingMessage}
              </div>
            ) : null}
            {publishedPodcast ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="min-w-0">
                  <div className="truncate font-bold text-white">{publishedPodcast.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {publishedPodcast.roomCode} · {publishedPodcast.durationSeconds ?? recordingElapsedSeconds}s
                  </div>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <a href={`/podcasts?roomCode=${encodeURIComponent(publishedPodcast.roomCode)}`}>
                    Open podcast
                  </a>
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Audience</p>
            <Badge variant="outline">{audienceParticipants.length} listening</Badge>
          </div>
          <div className="mt-4 flex flex-wrap items-start gap-4">
            {audienceParticipants.map((participant) => (
              <div key={participant.socketId} className="participant-enter group text-center">
                <div
                  className={`relative grid size-12 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-black text-white transition-all duration-300 group-hover:-translate-y-1 ${
                    participant.handRaised ? "ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)]" : ""
                  }`}
                >
                  {participantInitials(participant.displayName)}
                  {participant.handRaised ? (
                    <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-amber-400 text-slate-950">
                      <Hand className="size-3" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-20 truncate text-xs text-muted-foreground">
                  {participant.displayName}
                </p>
              </div>
            ))}
            {audienceParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audience members in this room.</p>
            ) : null}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black text-white">
                <Gift className="size-5 text-amber-300" /> {isLearner ? "Send a Gift" : "Room Gifts"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {hostParticipant
                  ? `Host: ${hostParticipant.displayName}`
                  : "The host must be present before gifts can be sent."}
              </p>
            </div>
            {giftNotice ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                giftNotice.kind === "received"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-primary/30 bg-primary/10 text-violet-200"
              }`}>
                {giftNotice.message}
              </div>
            ) : null}
          </div>
          {isLearner ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {giftCatalog.map((gift) => {
                const GiftIcon = giftIcons[gift.code] ?? Gift;
                return (
                  <button
                    key={gift.code}
                    type="button"
                    onClick={() => sendGift(gift)}
                    disabled={!hostParticipant || sendingGiftCode !== null}
                    className="group grid min-h-24 place-items-center rounded-3xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-primary/35 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <GiftIcon className="size-7 text-amber-300 transition-transform group-hover:scale-110" />
                    <span className="mt-2 text-xs font-black text-white">{gift.name}</span>
                    <span className="mt-1 text-xs font-bold text-muted-foreground">
                      {sendingGiftCode === gift.code ? "Sending..." : `${gift.price} Lucy Points`}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-muted-foreground">
              Learners in this room can send Lucy Points gifts to the active host.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 to-secondary/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Pinned Slide</p>
              <h3 className="mt-2 text-xl font-black text-white">
                {activeMaterial ? activeMaterial.title : "No slide pinned yet"}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {activeMaterial?.description ??
                  "Pin a Google Slides, Canva, PDF, or learning resource link so everyone in the room sees the current material."}
              </p>
            </div>
            {activeMaterial ? (
              <Button asChild variant="outline">
                <a href={activeMaterial.resourceUrl} target="_blank" rel="noreferrer">
                  Open slide <ExternalLink className="size-4" />
                </a>
              </Button>
            ) : null}
          </div>
          <div className="mt-5 grid min-h-44 place-items-center rounded-3xl border border-white/10 bg-[#0F172A]/70 p-5 text-center">
            {activeMaterial ? (
              <div>
                <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary/20 text-primary">
                  {(() => {
                    const Icon = materialIcon(activeMaterial.materialType);
                    return <Icon className="size-8" />;
                  })()}
                </div>
                <div className="mt-4 font-mono text-xs text-muted-foreground">{activeMaterial.resourceUrl}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pinned slides will appear here for the live room.</p>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-5 pb-28 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-black text-white">Timed flow</h3>
              <Badge variant={timeline?.completed ? "teal" : "outline"}>{timeline ? `${progress}%` : "Waiting"}</Badge>
            </div>
            {timeline ? (
              <>
                <Progress className="mt-4" value={progress} />
                <div className="mt-4 grid gap-3">
                  {timeline.steps.map((step) => (
                    <div key={step.subLevelId} className={`rounded-2xl border p-3 ${step.current ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"}`}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-bold text-white">{step.subOrder}. {step.title}</span>
                        <span className="font-bold text-muted-foreground">{step.startMinute}-{step.endMinute} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Launch a room to preview the 10-minute stage flow.</p>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <h3 className="flex items-center gap-2 font-black text-white">
              <Presentation className="size-5 text-primary" /> {canModerate ? "Pin slide to room" : "Pinned materials"}
            </h3>
            {canModerate ? (
            <form className="mt-4 grid gap-3" onSubmit={pinMaterial}>
              <div className="grid grid-cols-3 gap-2">
                {["SLIDE", "DOCUMENT", "LINK"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMaterialType(type)}
                    className={`rounded-2xl border px-3 py-2 text-xs font-black transition-colors ${
                      materialType === type
                        ? "border-primary/40 bg-primary/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <Input value={materialTitle} onChange={(event) => setMaterialTitle(event.target.value)} placeholder="Material title" disabled={!room} />
              <Input value={materialUrl} onChange={(event) => setMaterialUrl(event.target.value)} placeholder="Slide URL, document URL, or resource link" disabled={!room} />
              <Input value={materialDescription} onChange={(event) => setMaterialDescription(event.target.value)} placeholder="Short instruction for learners" disabled={!room} />
              <Button type="submit" variant="secondary" disabled={!room || !materialTitle || !materialUrl}>
                <Pin className="size-4" /> Pin slide
              </Button>
            </form>
            ) : null}
            <div className="mt-4 grid gap-3">
              {materials.length === 0 ? (
                <p className="text-sm leading-6 text-muted-foreground">No pinned slide or material.</p>
              ) : (
                materials.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-3 transition-colors ${
                      activeMaterial?.id === item.id
                        ? "border-primary/35 bg-primary/10"
                        : "border-white/10 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" className="min-w-0 text-left" onClick={() => setActiveMaterialId(item.id)}>
                        <div className="flex items-center gap-2 font-bold text-white">
                          {(() => {
                            const Icon = materialIcon(item.materialType);
                            return <Icon className="size-4 text-primary" />;
                          })()}
                          <span className="truncate">{item.title}</span>
                        </div>
                        <p className="mt-1 break-all text-xs text-muted-foreground">{item.resourceUrl}</p>
                      </button>
                      {canModerate ? (
                      <button
                        type="button"
                        onClick={() => unpinMaterial(item.id)}
                        className="grid size-8 shrink-0 place-items-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                        aria-label={`Unpin ${item.title}`}
                      >
                        <X className="size-4" />
                      </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {room ? (
      <div className="fixed bottom-6 left-1/2 z-40 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded-3xl border border-white/10 bg-[#1E293B]/95 p-3 shadow-panel backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant={isMuted ? "destructive" : "secondary"}
            onClick={toggleMic}
            disabled={!canSpeak && isMuted}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </Button>
          <Button type="button" className={`h-14 flex-1 rounded-3xl text-base ${handRaised ? "bg-amber-500 hover:bg-amber-500/90" : ""}`} onClick={toggleHand}>
            <Hand className="size-5" /> {handRaised ? "Hand Raised" : "Raise Hand"}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => setAudioPanelOpen((open) => !open)}
            aria-label="Audio devices"
          >
            <Settings2 className="size-5" />
          </Button>
          <Button type="button" size="icon" variant="destructive" onClick={leaveRoom} aria-label="Leave room">
            <X className="size-5" />
          </Button>
        </div>
      </div>
      ) : null}
    </div>
  );
}
