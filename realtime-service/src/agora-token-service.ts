import { createHash } from "node:crypto";
import agoraToken from "agora-token";

const { RtcTokenBuilder } = agoraToken;

type AgoraTokenOptions = {
  appId: string;
  appCertificate: string;
  ttlSeconds: number;
};

export type AgoraParticipantRole = "audience" | "speaker";

export class AgoraTokenService {
  constructor(private readonly options: AgoraTokenOptions) {}

  get configured(): boolean {
    return Boolean(this.options.appId && this.options.appCertificate);
  }

  createToken(channelName: string, personaId: string, role: AgoraParticipantRole) {
    if (!this.configured) {
      throw new Error("Agora is not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.");
    }

    const uid = this.toAgoraUid(personaId);
    const publishAudioTtl = role === "speaker" ? this.options.ttlSeconds : 0;
    const token = RtcTokenBuilder.buildTokenWithUidAndPrivilege(
      this.options.appId,
      this.options.appCertificate,
      channelName,
      uid,
      this.options.ttlSeconds,
      this.options.ttlSeconds,
      publishAudioTtl,
      0,
      0
    );

    return {
      appId: this.options.appId,
      channel: channelName,
      uid,
      token,
      role,
      expiresInSeconds: this.options.ttlSeconds
    };
  }

  toAgoraUid(personaId: string): number {
    const digest = createHash("sha256").update(personaId).digest();
    const value = digest.readUInt32BE(0);
    return value === 0 ? 1 : value;
  }
}
