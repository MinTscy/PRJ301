"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  UID
} from "agora-rtc-sdk-ng";
import { requestAgoraToken } from "./realtime";

export type AudioConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "unavailable"
  | "error";

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
  const [status, setStatus] = useState<AudioConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [speakingUids, setSpeakingUids] = useState<Set<number>>(new Set());
  const [remoteAudioUids, setRemoteAudioUids] = useState<Set<number>>(new Set());

  const closeMicrophone = useCallback(async () => {
    const client = clientRef.current;
    const track = microphoneRef.current;
    microphoneRef.current = null;
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
    }
  }, []);

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
    setError(null);

    const handlePublished = async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video" | "datachannel") => {
      if (mediaType !== "audio" || !client) return;
      await client.subscribe(user, "audio");
      const uid = numericUid(user.uid);
      if (uid !== null) {
        remoteUsers.set(uid, user);
        setRemoteAudioUids((current) => new Set(current).add(uid));
      }
      user.audioTrack?.play();
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
        client.on("volume-indicator", (volumes) => {
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
        if (cancelled) return;
        client.enableAudioVolumeIndicator();
        setStatus("connected");
      } catch (joinError) {
        if (cancelled) return;
        const message = joinError instanceof Error ? joinError.message : "Unable to join room audio";
        setError(message);
        setStatus(message.includes("not configured") ? "unavailable" : "error");
      }
    }

    void joinAudio();

    return () => {
      cancelled = true;
      client?.removeAllListeners();
      remoteUsers.clear();
      setRemoteAudioUids(new Set());
      setSpeakingUids(new Set());
      void closeMicrophone().finally(() => client?.leave());
      if (clientRef.current === client) clientRef.current = null;
    };
  }, [accessToken, closeMicrophone, participantRole, personaId, roomCode]);

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
            AEC: true,
            ANS: true,
            AGC: true
          }));
        if (cancelled) {
          track.close();
          return;
        }
        microphoneRef.current = track;
        if (!activeClient.localTracks.includes(track)) {
          await activeClient.publish(track);
        }
      } catch (microphoneError) {
        if (!cancelled) {
          const denied = microphoneError instanceof DOMException &&
            (microphoneError.name === "NotAllowedError" || microphoneError.name === "SecurityError");
          setError(denied
            ? "Microphone permission was denied. Allow microphone access in your browser settings and try again."
            : microphoneError instanceof Error
              ? microphoneError.message
              : "Unable to access microphone");
        }
      }
    }
    void publishMicrophone();
    return () => {
      cancelled = true;
    };
  }, [closeMicrophone, micMuted, participantRole, status]);

  return {
    status,
    error,
    speakingUids,
    remoteAudioUids,
    enableAudioPlayback
  };
}
