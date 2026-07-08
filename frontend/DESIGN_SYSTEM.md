# LUCY Design System Extraction

Figma source:

```text
https://www.figma.com/design/K8GZimfyfjU2XAu6qVcBUK/Design-System-for-LUCY
```

Local export used:

```text
C:\Users\triet\Downloads\Design System for LUCY
```

## Extraction Status

The Figma MCP account still has view-seat access only, so direct node inspection is blocked. The implementation now uses the local Figma export, including `src/styles/theme.css` and `src/app/App.tsx`, as the design-system source of truth.

## Brand Principles

- Dark mode first.
- Social-learning friendly, with live rooms and learner identity cues.
- CEFR-first visual hierarchy.
- Mobile shell with bottom navigation and desktop sidebar.
- Live room actions keep mic, raise hand, and leave controls visible.

## Color Tokens

| Token | Tailwind | Role |
| --- | --- | --- |
| Primary | `#6C63FF` | Main action and active states |
| Secondary | `#8B5CF6` | Gradients and supporting action |
| Accent | `#22C55E` | Progress, online, success |
| Destructive | `#EF4444` | Muted mic, leave, errors |
| Background | `#0F172A` | App background |
| Surface | `#1E293B` | Cards, room controls, sidebar panels |
| Text Primary | `#F8FAFC` | High-emphasis text |
| Text Muted | `#94A3B8` | Secondary text |

## CEFR Bands

| Band | Range | Purpose |
| --- | --- | --- |
| Pre-A1 Starters | Levels 1-10 | Safe first responses and picture talk |
| A1 Movers | Levels 11-20 | Everyday exchanges and simple reasons |
| A2 Flyers | Levels 21-30 | Longer turns and guided conversations |
| Extension | Levels 31-100 | B1+ speaking, reasoning, and live discussion |

## Components

- `Button`
- `Card`
- `Badge`
- `Input`
- `Progress`
- `Separator`
- `CEFRCard`
- `LevelCard`
- `MetricCard`
- `PageHeader`
- `EmptyState`

## Screens

- `/` Overview
- `/levels` Level library
- `/levels/[id]` Level detail
- `/coverage` Data readiness
- `/rooms` Live room studio
- `/design-system` Design system reference

## Backend Contract

Default API base:

```text
http://localhost:8080
```

Environment variable:

```text
NEXT_PUBLIC_API_BASE_URL
```
