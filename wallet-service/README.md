# LUCY Wallet Service

ASP.NET Core service for the week 8-9 sandbox wallet, top-up, and realtime gift flow.

## Run

```powershell
dotnet run --project wallet-service
```

Default URL: `http://localhost:5002`.

The service validates the existing opaque bearer token through Java
`GET /api/auth/me`, persists wallet data in SQLite, and sends committed gift
events to Node `POST /internal/gifts`.

## Endpoints

```http
GET  /health
GET  /api/gifts/catalog
GET  /api/wallet
GET  /api/wallet/transactions
POST /api/topups
POST /api/gifts/send
GET  /api/gifts/rooms/{roomCode}
```

Top-up request (adds sandbox Lucy Points immediately):

```json
{ "amount": 500, "provider": "SANDBOX", "idempotencyKey": "checkout-123" }
```

Gift request:

```json
{
  "roomCode": "LUCY-12345678",
  "giftCode": "ROCKET",
  "recipientPersonaId": "persona_demo_pro"
}
```

Production payment providers must replace the sandbox completion flow with a
signed provider callback and idempotency key before real money is enabled.
