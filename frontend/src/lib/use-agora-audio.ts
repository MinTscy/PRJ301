"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ConnectionState,
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  NetworkQuality,
  IRemoteAudioTrack,
  UID
} from "agora-rtc-sdk-ng";
import { requestAgoraToken } from "./realtime";

export type AudioConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "unavailable"
  | "error";

export type AudioDeviceOption = {
  deviceId: string;
  label: string;
};

export type BrowserMicrophonePermission =
  | "unsupported"
  | "prompt"
  | "granted"
  | "denied"
  | "unknown";

export type AudioWarning =
  | "microphone-ended"
  | "muted-while-speaking"
  | "no-microphone-signal"
  | "poor-network"
  | "reconnecting"
  | null;

type UseAgoraAudioOptions = {
  roomCode?: string;
  personaId?: string;
  participantRole?: "audience" | "speaker" | "moderator";
  micMuted: boolean;
  accessToken?: string;
};

function numericUid(uid: UID): number | null {
  const value = typeof uid === "number" ? uid : Number(uid);
  return Number.isFinite(value) ? value : null;
}

function deviceLabel(device: MediaDeviceInfo, fallback: string, index: number) {
  return device.label || `${fallback} ${index + 1}`;
}

function canQueryMicrophonePermission() {
  return typeof navigator !== "undefined" && "permissions" in navigator;
}

function networkIsPoor(stats: NetworkQuality | null) {
  if (!stats) return false;
  return stats.uplinkNetworkQuality >= 4 || stats.downlinkNetworkQuality >= 4;
}

export function useAgoraAudio({
  roomCode,
  personaId,
  participantRole,
  micMuted,
  accessToken
}: UseAgoraAudioOptions) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const agoraRef = useRef<typeof import("agora-rtc-sdk-ng").default | null>(null);
  const microphoneRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteUsersRef = useRef<Map<number, IAgoraRTCRemoteUser>>(new Map());
  const selectedPlaybackDeviceIdRef = useRef("");
  const localUidRef = useRef<number | null>(null);
  const [status, setStatus] = useState<AudioConnectionStatus>("idle");
  const [connectionState, setConnectionState] = useState<ConnectionState>("DISCONNECTED");
  const [error, setError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [warning, setWarning] = useState<AudioWarning>(null);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality | null>(null);
  const [localVolumeLevel, setLocalVolumeLevel] = useState(0);
  const [microphonePublished, setMicrophonePublished] = useState(false);
  const [speakingUids, setSpeakingUids] = useState<Set<number>>(new Set());
  const [remoteAudioUids, setRemoteAudioUids] = useState<Set<number>>(new Set());
  const [microphones, setMicrophones] = useState<AudioDeviceOption[]>([]);
  const [playbackDevices, setPlaybackDevices] = useState<AudioDeviceOption[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState("");
  const [selectedPlaybackDeviceId, setSelectedPlaybackDeviceId] = useState("");
  const [microphonePermission, setMicrophonePermission] =
    useState<BrowserMicrophonePermission>("unknown");

  const refreshMicrophonePermission = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicrophonePermission("unsupported");
      return;
    }
    if (!canQueryMicrophonePermission()) {
      setMicrophonePermission("unknown");
      return;
    }
    try {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      setMicrophonePermission(result.state);
      result.onchange = () => setMicrophonePermission(result.state);
    } catch {
      setMicrophonePermission("unknown");
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    setDeviceError(null);
    try {
      const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
      agoraRef.current = AgoraRTC;
      const [microphoneDevices, speakerDevices] = await Promise.all([
        AgoraRTC.getMicrophones(true).catch(async () => {
          if (!navigator.mediaDevices?.enumerateDevices) return [];
          const devices = await navigator.mediaDevices.enumerateDevices();
          return devices.filter((device) => device.kind === "audioinput");
        }),
        AgoraRTC.getPlaybackDevices(true).catch(async () => {
          if (!navigator.mediaDevices?.enumerateDevices) return [];
          const devices = await navigator.mediaDevices.enumerateDevices();
          return devices.filter((device) => device.kind === "audiooutput");
        })
      ]);

      const nextMicrophones = microphoneDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: deviceLabel(device, "Microphone", index)
      }));
      const nextPlaybackDevices = speakerDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: deviceLabel(device, "Speaker", index)
      }));

      setMicrophones(nextMicrophones);
      setPlaybackDevices(nextPlaybackDevices);
      setSelectedMicrophoneId((current) =>
        current && nextMicrophones.some((device) => device.deviceId === current)
          ? current
          : (nextMicrophones[0]?.deviceId ?? "")
      );
      setSelectedPlaybackDeviceId((current) =>
        current && nextPlaybackDevices.some((device) => device.deviceId === current)
          ? current
          : (nextPlaybackDevices[0]?.deviceId ?? "")
      );
    } catch (devicesError) {
      setDeviceError(devicesError instanceof Error ? devicesError.message : "Unable to load audio devices");
    }
  }, []);

  const applyPlaybackDevice = useCallback(async (track: IRemoteAudioTrack, deviceId: string) => {
    if (!deviceId) return;
    try {
      await track.setPlaybackDevice(deviceId);
      setDeviceError(null);
    } catch (playbackError) {
      const message = playbackError instanceof Error ? playbackError.message : "Speaker selection is not supported";
      setDeviceError(message.includes("NOT_SUPPORTED")
        ? "Speaker selection is supported only by some desktop browsers."
        : message);
    }
  }, []);

  const requestMicrophoneAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophonePermission("unsupported");
      setDeviceError("This browser does not expose microphone access.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : true
      });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophonePermission("granted");
      await refreshDevices();
      setDeviceError(null);
      return true;
    } catch (permissionError) {
      const denied = permissionError instanceof DOMException &&
        (permissionError.name === "NotAllowedError" || permissionError.name === "SecurityError");
      setMicrophonePermission(denied ? "denied" : "unknown");
      setDeviceError(denied
        ? "Microphone permission was denied. Allow microphone access in your browser settings and try again."
        : permissionError instanceof Error
          ? permissionError.message
          : "Unable to access microphone");
      return false;
    }
  }, [refreshDevices, selectedMicrophoneId]);

  const closeMicrophone = useCallback(async () => {
    const client = clientRef.current;
    const track = microphoneRef.current;
    microphoneRef.current = null;
    setMicrophonePublished(false);
    setLocalVolumeLevel(0);
    if (!track) return;
    try {
      if (client?.localTracks.includes(track)) {
        await client.unpublish(track);
      }
    } finally {
      track.stop();
      track.close();
    }
  }, []);

  const enableAudioPlayback = useCallback(() => {
    for (const user of remoteUsersRef.current.values()) {
      user.audioTrack?.play();
      if (user.audioTrack) {
        void applyPlaybackDevice(user.audioTrack, selectedPlaybackDeviceId);
      }
    }
  }, [applyPlaybackDevice, selectedPlaybackDeviceId]);

  useEffect(() => {
    void refreshMicrophonePermission();
    void refreshDevices();

    const handleDeviceChange = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange);
  }, [refreshDevices, refreshMicrophonePermission]);

  useEffect(() => {
    if (!roomCode || !personaId || !participantRole) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const activeRoomCode = roomCode;
    const activePersonaId = personaId;
    const audioRole = participantRole === "audience" ? "audience" : "speaker";
    let client: IAgoraRTCClient | null = null;
    const remoteUsers = new Map<number, IAgoraRTCRemoteUser>();
    remoteUsersRef.current = remoteUsers;
    setStatus("connecting");
    setConnectionState("CONNECTING");
    setError(null);
    setWarning(null);

    const handlePublished = async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video" | "datachannel") => {
      if (mediaType !== "audio" || !client) return;
      await client.subscribe(user, "audio");
      const uid = numericUid(user.uid);
      if (uid !== null) {
        remoteUsers.set(uid, user);
        setRemoteAudioUids((current) => new Set(current).add(uid));
      }
      user.audioTrack?.play();
      if (user.audioTrack) {
        void applyPlaybackDevice(user.audioTrack, selectedPlaybackDeviceIdRef.current);
      }
    };
    const handleUnpublished = (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video" | "datachannel") => {
      if (mediaType !== "audio") return;
      const uid = numericUid(user.uid);
      if (uid === null) return;
      remoteUsers.delete(uid);
      setRemoteAudioUids((current) => {
        const next = new Set(current);
        next.delete(uid);
        return next;
      });
    };
    const handleLeft = (user: IAgoraRTCRemoteUser) => {
      const uid = numericUid(user.uid);
      if (uid === null) return;
      remoteUsers.delete(uid);
      setRemoteAudioUids((current) => {
        const next = new Set(current);
        next.delete(uid);
        return next;
      });
      setSpeakingUids((current) => {
        const next = new Set(current);
        next.delete(uid);
        return next;
      });
    };

    async function joinAudio() {
      try {
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        if (cancelled) return;
        agoraRef.current = AgoraRTC;
        client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;
        client.on("user-published", handlePublished);
        client.on("user-unpublished", handleUnpublished);
        client.on("user-left", handleLeft);
        client.on("connection-state-change", (currentState) => {
          setConnectionState(currentState);
          setWarning(currentState === "RECONNECTING" ? "reconnecting" : null);
        });
        client.on("network-quality", (quality) => {
          setNetworkQuality(quality);
          setWarning((current) => {
            if (current === "microphone-ended" || current === "muted-while-speaking" || current === "no-microphone-signal") {
              return current;
            }
            return networkIsPoor(quality) ? "poor-network" : null;
          });
        });
        client.on("token-privilege-will-expire", async () => {
          try {
            const credentials = await requestAgoraToken(
              activeRoomCode,
              activePersonaId,
              audioRole,
              accessToken
            );
            await client?.renewToken(credentials.token);
          } catch (renewError) {
            setError(renewError instanceof Error ? renewError.message : "Unable to renew Agora audio token");
          }
        });
        client.on("token-privilege-did-expire", async () => {
          try {
            const credentials = await requestAgoraToken(
              activeRoomCode,
              activePersonaId,
              audioRole,
              accessToken
            );
            await client?.join(credentials.appId, credentials.channel, credentials.token, credentials.uid);
          } catch (renewError) {
            setError(renewError instanceof Error ? renewError.message : "Agora audio token expired");
          }
        });
        client.on("volume-indicator", (volumes) => {
          const localUid = localUidRef.current;
          const localVolume = volumes.find((volume) => numericUid(volume.uid) === localUid);
          setLocalVolumeLevel(localVolume?.level ?? 0);
          setSpeakingUids(
            new Set(
              volumes
                .filter((volume) => volume.level >= 35)
                .map((volume) => numericUid(volume.uid))
                .filter((uid): uid is number => uid !== null)
            )
          );
        });
        const credentials = await requestAgoraToken(
          activeRoomCode,
          activePersonaId,
          audioRole,
          accessToken
        );
        if (cancelled) return;
        await client.join(
          credentials.appId,
          credentials.channel,
          credentials.token,
          credentials.uid
        );
        localUidRef.current = credentials.uid;
        if (cancelled) return;
        client.enableAudioVolumeIndicator();
        setStatus("connected");
        setConnectionState("CONNECTED");
      } catch (joinError) {
        if (cancelled) return;
        const message = joinError instanceof Error ? joinError.message : "Unable to join room audio";
        setError(message);
        setConnectionState("DISCONNECTED");
        setStatus(message.includes("not configured") ? "unavailable" : "error");
      }
    }

    void joinAudio();

    return () => {
      cancelled = true;
      client?.removeAllListeners();
      remoteUsers.clear();
      localUidRef.current = null;
      setConnectionState("DISCONNECTED");
      setRemoteAudioUids(new Set());
      setSpeakingUids(new Set());
      setNetworkQuality(null);
      setLocalVolumeLevel(0);
      setWarning(null);
      void closeMicrophone().finally(() => client?.leave());
      if (clientRef.current === client) clientRef.current = null;
    };
  }, [
    accessToken,
    applyPlaybackDevice,
    closeMicrophone,
    participantRole,
    personaId,
    roomCode
  ]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client || status !== "connected" || participantRole === "audience") {
      void closeMicrophone();
      return;
    }
    const activeClient = client;
    const AgoraRTC = agoraRef.current;
    if (!AgoraRTC) return;
    const activeAgora = AgoraRTC;

    if (micMuted) {
      void closeMicrophone();
      return;
    }

    let cancelled = false;
    async function publishMicrophone() {
      try {
        const track =
          microphoneRef.current ??
          (await activeAgora.createMicrophoneAudioTrack({
            encoderConfig: "speech_standard",
            ...(selectedMicrophoneId ? { microphoneId: selectedMicrophoneId } : {}),
            AEC: true,
            ANS: true,
            AGC: true
          }));
        if (cancelled) {
          track.close();
          return;
        }
        microphoneRef.current = track;
        track.on("track-ended", () => {
          microphoneRef.current = null;
          setMicrophonePublished(false);
          setLocalVolumeLevel(0);
          setMicrophonePermission("unknown");
          setWarning("microphone-ended");
          setDeviceError("Microphone stopped. Check browser permission or reconnect the device.");
        });
        setMicrophonePermission("granted");
        if (!activeClient.localTracks.includes(track)) {
          await activeClient.publish(track);
        }
        setMicrophonePublished(true);
        setWarning((current) => current === "microphone-ended" ? null : current);
      } catch (microphoneError) {
        if (!cancelled) {
          const denied = microphoneError instanceof DOMException &&
            (microphoneError.name === "NotAllowedError" || microphoneError.name === "SecurityError");
          setError(denied
            ? "Microphone permission was denied. Allow microphone access in your browser settings and try again."
            : microphoneError instanceof Error
              ? microphoneError.message
              : "Unable to access microphone");
          setMicrophonePermission(denied ? "denied" : "unknown");
          setMicrophonePublished(false);
        }
      }
    }
    void publishMicrophone();
    return () => {
      cancelled = true;
    };
  }, [closeMicrophone, micMuted, participantRole, selectedMicrophoneId, status]);

  useEffect(() => {
    const track = microphoneRef.current;
    if (!track || !selectedMicrophoneId) return;
    void track.setDevice(selectedMicrophoneId).catch((switchError) => {
      setDeviceError(switchError instanceof Error ? switchError.message : "Unable to switch microphone");
    });
  }, [selectedMicrophoneId]);

  useEffect(() => {
    if (micMuted || participantRole === "audience" || !microphonePublished || status !== "connected") {
      if (warning === "no-microphone-signal") setWarning(networkIsPoor(networkQuality) ? "poor-network" : null);
      return;
    }
    if (localVolumeLevel > 3) {
      if (warning === "no-microphone-signal") setWarning(networkIsPoor(networkQuality) ? "poor-network" : null);
      return;
    }
    const timeout = window.setTimeout(() => {
      setWarning((current) => current ?? "no-microphone-signal");
    }, 7000);
    return () => window.clearTimeout(timeout);
  }, [
    localVolumeLevel,
    micMuted,
    microphonePublished,
    networkQuality,
    participantRole,
    status,
    warning
  ]);

  useEffect(() => {
    selectedPlaybackDeviceIdRef.current = selectedPlaybackDeviceId;
    if (!selectedPlaybackDeviceId) return;
    for (const user of remoteUsersRef.current.values()) {
      if (user.audioTrack) void applyPlaybackDevice(user.audioTrack, selectedPlaybackDeviceId);
    }
  }, [applyPlaybackDevice, selectedPlaybackDeviceId]);

  return {
    status,
    connectionState,
    error,
    deviceError,
    warning,
    networkQuality,
    localVolumeLevel,
    microphonePublished,
    speakingUids,
    remoteAudioUids,
    microphones,
    playbackDevices,
    selectedMicrophoneId,
    selectedPlaybackDeviceId,
    microphonePermission,
    setSelectedMicrophoneId,
    setSelectedPlaybackDeviceId,
    refreshDevices,
    requestMicrophoneAccess,
    enableAudioPlayback
  };
}
