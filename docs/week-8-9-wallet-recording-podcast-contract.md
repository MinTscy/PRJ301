# Week 8-9 Wallet, Gift, Recording And Podcast Contract

## Services

| Service | URL | Week 8-9 responsibility |
| --- | --- | --- |
| Java LMS | `http://localhost:8080` | Existing opaque auth token and room validation |
| Node realtime | `http://localhost:3001` | Gift broadcast and podcast recording storage |
| .NET wallet | `http://localhost:5002` | Wallet, sandbox top-up, gift transaction ledger |
| Flutter mobile | emulator | Podcast playback and realtime gift celebration |

## Gift flow

```text
Mobile/Web -> POST .NET /api/gifts/send (Bearer token)
-> SQLite wallet debit + gift ledger commit
-> POST Node /internal/gifts (shared internal secret)
-> Socket.IO gift:received to room
-> Flutter animated gift overlay
```

Gift codes seeded by .NET: `APPLAUSE`, `COFFEE`, `STAR`, `ROCKET`.

## Recording flow (LUCY_SUPER only)

Start metadata:

```http
POST /api/realtime/recordings
Authorization: Bearer <super-token>

{ "roomCode": "LUCY-12345678", "title": "Level 5 recap" }
```

Upload a captured audio file and publish it:

```http
PUT /api/realtime/recordings/{id}/audio?durationSeconds=1800
Authorization: Bearer <super-token>
Content-Type: audio/webm
```

An external recorder may instead complete with an HTTPS audio URL:

```http
POST /api/realtime/recordings/{id}/complete
Authorization: Bearer <super-token>

{ "audioUrl": "https://storage.example/episode.mp3", "durationSeconds": 1800 }
```

Published episodes are public through `GET /api/realtime/podcasts`; local audio
is served from `/recordings/{file}`. Metadata is persisted under the configured
`RECORDINGS_DIR`.

This iteration provides storage and publishing. Capturing/mixing an Agora room
must be performed by a client recorder or a future Agora Cloud Recording adapter.
