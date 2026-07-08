# LUCY Realtime Service

Node.js service for Agora RTC token generation, room signaling, raised-hand moderation, microphone state, and automatic LMS stage updates.

Week 8-9 also adds LUCY Super recording storage, a public Podcast feed, and
internal realtime gift delivery from the .NET wallet service.

## Run

```powershell
copy .env.example .env
npm install
npm run build
npm start
```

Default URL:

```text
http://localhost:3001
```

## Agora Configuration

Set these values from Agora Console:

```properties
AGORA_APP_ID=your-app-id
AGORA_APP_CERTIFICATE=your-app-certificate
```

The server uses AccessToken2 through `agora-token`.

```http
POST /api/realtime/token
Authorization: Bearer <optional LUCY auth token>
Content-Type: application/json

{
  "roomCode": "LUCY-12345678",
  "personaId": "persona_demo_learner",
  "role": "audience"
}
```

Speaker tokens require either:

- A `LUCY_PRO` or `LUCY_SUPER` bearer token.
- An active Socket.IO participant previously approved by a moderator.

## Socket.IO Events

Client to server:

- `room:join`
- `mic:set`
- `hand:raise`
- `hand:lower`
- `moderation:approve-speaker`
- `moderation:move-to-audience`

Server to client:

- `room:state`
- `timeline:updated`
- `stage:changed`
- `moderation:approved`
- `moderation:moved-to-audience`
- `realtime:error`

## Stage Transition

The service polls:

```http
GET /api/rooms/{roomCode}/timeline
```

Java provides the room elapsed time and ordered topic list. Node applies a fixed topic window configured by:

```properties
TOPIC_DURATION_MINUTES=10
```

At minutes `10`, `20`, `30`, and so on, Node advances `currentStep` to the next topic. It emits `timeline:updated` after every successful poll and emits `stage:changed` when `currentStep.subOrder` changes.

## Tests

```powershell
npm test
npm run test:realtime
npm run test:survival
```

Recording and gift contracts are documented in
`../docs/week-8-9-wallet-recording-podcast-contract.md`.
