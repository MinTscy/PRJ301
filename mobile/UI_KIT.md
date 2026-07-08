# LUCY Mobile UI Kit

## Foundations

- Dark-first operational interface.
- Primary: `#6C63FF`
- Secondary: `#8B5CF6`
- Success: `#22C55E`
- Warning: `#F59E0B`
- Danger: `#EF4444`
- Background: `#0F172A`
- Surface: `#1E293B`
- Text: `#F8FAFC`
- Muted text: `#94A3B8`

Spacing scale: `4, 8, 12, 16, 24, 32, 48`.

## Reusable components

- `LucyPageHeader`
- `LucySectionCard`
- `LucyStatusBadge`
- `LucyEmptyState`
- `MetricCard`
- `ParticipantCard`

The in-app preview is available from:

```text
Profile -> UI Kit
```

## Navigation flow

```text
Login
  -> Mobile shell
      -> Overview
      -> Live room / Pro dashboard
      -> Materials
      -> Profile
          -> UI Kit
          -> Logout
```

The bottom navigation uses `IndexedStack`, so the live-room connection and
screen state remain alive while the mentor checks another tab.
