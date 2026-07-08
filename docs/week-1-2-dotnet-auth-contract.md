# Week 1-2 Auth Contract

The original plan assigned identity to a .NET service. Because that service is not present in this workspace, the Java LMS now implements the same local contract under `/api/auth/*` so development can continue without blocking mobile/web work. The role names and response shape remain compatible with a future .NET extraction.

## Java Database Tables

Hibernate `ddl-auto=update` creates these tables in the existing `lucy_lms` MySQL database:

- `app_users`: email, display name, BCrypt password hash, role, persona id, anonymous/enabled flags, timestamps.
- `auth_sessions`: SHA-256 access token hash, issued/expires/revoked timestamps, user foreign key.

## Account Types

| Role | Purpose | Key permissions |
| --- | --- | --- |
| LUCY | Anonymous learner | Join rooms, raise hand, toggle mic, view assigned level content |
| LUCY_PRO | Mentor | Create rooms, pin learning materials, moderate learners |
| LUCY_SUPER | Content creator | Pro permissions plus podcast/premium content workflows |

## Core Endpoints

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

## Register Request

```json
{
  "email": "mentor@example.com",
  "password": "ChangeMe123!",
  "displayName": "LUCY Mentor",
  "role": "LUCY_PRO"
}
```

## Login Response

```json
{
  "accessToken": "jwt-access-token",
  "expiresInSeconds": 28800,
  "user": {
    "id": 1,
    "email": "mentor@example.com",
    "displayName": "LUCY Mentor",
    "role": "LUCY_PRO",
    "personaId": "persona-id",
    "anonymous": false
  }
}
```

The current Java token is an opaque bearer token, not a JWT. Only a SHA-256 hash of the token is stored in `auth_sessions`.

## Token Claims Needed By Java/Node/Mobile

```json
{
  "sub": "user-id",
  "role": "LUCY_PRO",
  "display_name": "LUCY Mentor",
  "persona_id": "persona-id",
  "anonymous": false
}
```

## Integration Notes

- Java LMS should receive only role/persona context from the auth token.
- Node.js realtime service should not receive private identity data; it should use `persona_id`.
- Mobile should store access token securely and refresh through the .NET service.
- Role names must stay stable: `LUCY`, `LUCY_PRO`, `LUCY_SUPER`.
