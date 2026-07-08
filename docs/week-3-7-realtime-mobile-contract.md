# Week 3-7 Realtime And Mobile Contract

## Services

| Service | URL | Responsibility |
| --- | --- | --- |
| Java LMS | `http://localhost:8080` | Levels, rooms, timeline, pinned material, auth |
| Node realtime | `http://localhost:3001` | Agora token, mic/hand signaling, moderation, stage events |
| Next web | `http://localhost:3000` | Reference client and Pro dashboard |

## Mobile Join Flow

```text
Login through Java /api/auth/login
-> Create or receive a Java room code
-> Connect Socket.IO to port 3001
-> Emit room:join
-> Request Agora token
-> Initialize Agora Voice SDK
-> Join channel using roomCode as channel name
```

## Socket.IO Payloads

Join:

```json
{
  "roomCode": "LUCY-12345678",
  "personaId": "persona_demo_learner",
  "displayName": "Alex Kim",
  "accessToken": "optional-java-access-token"
}
```

Mic:

```json
{
  "muted": true
}
```

Raise hand:

```text
event: hand:raise
payload: {}
```

Approve speaker, Pro only:

```json
{
  "roomCode": "LUCY-12345678",
  "personaId": "persona_demo_learner"
}
```

After `moderation:approved`, request a new Agora token with role `speaker`, renew or rejoin the Agora channel, then enable microphone publishing.

## Pro Dashboard Data

Use the `room:state` event. Participants include:

- `personaId`
- `displayName`
- `accountRole`
- `participantRole`
- `micMuted`
- `handRaised`
- `joinedAt`
- `agoraUid`

The Flutter implementation is available in `mobile/`. It connects with a Pro access token and supports:

- Raised-hand queue.
- Approving an audience member as a speaker.
- Moving a speaker back to the audience.
- Live learner, speaker, and waiting counts.
- Current and next 10-minute topic display.

## Stage Updates

Listen for:

```text
timeline:updated
stage:changed
```

Java provides elapsed room time and the ordered topic list. Node assigns each topic a 10-minute window and emits `stage:changed` when the active `subOrder` changes at minute 10, 20, 30, and so on.

## Web Audio

The Next.js live-room screen requests Agora tokens from Node.js, subscribes to
remote audio, publishes the local microphone for unmuted moderators/speakers,
and maps volume indicators to participants through `agoraUid`.

Configure `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` in
`realtime-service/.env` before testing audio.

## Pinned Slides

Mobile reads:

```http
GET /api/rooms/{roomCode}/materials
```

Pro users manage:

```http
POST /api/rooms/{roomCode}/materials
DELETE /api/rooms/{roomCode}/materials/{materialId}
```
