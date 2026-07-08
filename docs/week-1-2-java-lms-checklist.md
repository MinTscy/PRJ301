# Week 1-2 Java LMS Checklist

## Already Implemented

- Import one DOCX file: `POST /api/import/docx`
- Batch DOCX import: `POST /api/import/docx/batch`
- Import local sample folder: `POST /api/import/docx/from-folder`
- Preview DOCX before import: `POST /api/import/preview`
- Get language list: `GET /api/languages`
- Get levels by language and stage: `GET /api/languages/{code}/stages/{stageNumber}/levels`
- Get level detail: `GET /api/levels/{id}/detail`
- Create live room for Level 1-5 demo: `POST /api/rooms/survival-speaking`
- Pin room materials: `POST /api/rooms/{roomCode}/materials`

## Added For Week 1-2 Readiness

```http
GET /api/levels/coverage
```

This endpoint reports imported and missing level numbers for the expected 100-level path:

- Stage 1: levels 1-30
- Stage 2: levels 31-60
- Stage 3: levels 61-100

Use it before demo or import sessions to confirm whether each language is ready.

