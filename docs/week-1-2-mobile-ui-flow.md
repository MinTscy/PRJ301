# Week 1-2 Mobile UI Kit And Flow

The Flutter source is available in `mobile/`. It includes the shared UI Kit,
login flow, bottom navigation shell, Pro dashboard, material view, profile, and
an in-app UI Kit reference screen.

## UI Kit Foundations

| Token | Recommended use |
| --- | --- |
| Primary color | Room join, main CTA, active stage |
| Secondary color | Pinned materials, learning support |
| Alert color | Mic state, moderation warning |
| Card radius | 8px |
| Screen density | Operational and scannable, not marketing style |

## Core Screens

1. Pro login/account confirmation
2. Overview dashboard
3. Live room connection
4. Pro learner dashboard
5. Raise-hand queue and speaker controls
6. Current/next topic timeline
7. Pinned material library
8. Profile and settings
9. UI Kit reference

## Learner Flow

```text
Launch app
-> Login/Register through .NET auth
-> Select language
-> Select level
-> Join anonymous room
-> Raise hand or toggle mic
-> View pinned material and moderator prompts
```

## Mentor Flow

```text
Launch app
-> Login as LUCY_PRO
-> Select language and level
-> Create live room through Java LMS
-> Pin slide/document/link
-> Monitor timeline and move through sub-levels
-> Moderate raised hands and mic access
```

## Java LMS APIs Used By Mobile

```http
GET /api/languages
GET /api/languages/{code}/stages/{stageNumber}/levels
GET /api/levels/{id}/detail
GET /api/levels/coverage
POST /api/rooms
POST /api/rooms/survival-speaking
GET /api/rooms/{roomCode}
GET /api/rooms/{roomCode}/timeline
GET /api/rooms/{roomCode}/materials
```

## UI States To Design

- Loading
- Empty language/stage
- Missing level data
- Live room idle
- Live room active
- Mic muted/unmuted
- Hand raised/waiting/approved
- Material loading/error
