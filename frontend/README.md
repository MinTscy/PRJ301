# LUCY LMS Frontend

Browser audio requests microphone access only when a moderator or approved
speaker unmutes. The production response includes
`Permissions-Policy: microphone=(self)`. Use HTTPS outside localhost so browser
media-device permission APIs remain available.

Next.js 15 + TypeScript + Tailwind CSS + Shadcn UI implementation for the LUCY LMS product surface.

## Run

```bash
npm install
npm run dev
```

The app expects the Java LMS backend at:

```text
http://localhost:8080
```

Override with:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

The live-room screen also expects the realtime service at
`http://localhost:3001`. Realtime participant lists work immediately; Agora
microphone and remote audio require `AGORA_APP_ID` and
`AGORA_APP_CERTIFICATE` in `realtime-service/.env`.

## Screens

- Dashboard
- Level library
- Level detail
- Coverage readiness
- Live room studio
- Design system reference

## Figma Note

The provided Figma Make link requires edit access for the MCP tool. The implementation uses a LUCY-specific design system derived from the CEFR/LMS product requirements and the existing backend capabilities.
