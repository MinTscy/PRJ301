namespace Lucy.WalletService;

public sealed record AuthUser(
    long Id,
    string Email,
    string DisplayName,
    string Role,
    string PersonaId,
    bool Anonymous);

public sealed record TopUpRequest(
    int Amount,
    string Provider = "SANDBOX",
    string? IdempotencyKey = null);

public sealed record SendGiftRequest(
    string RoomCode,
    string GiftCode,
    string RecipientPersonaId);

public sealed record WalletTransaction(
    string Id,
    string Type,
    int Amount,
    string Reference,
    DateTimeOffset CreatedAt);

public sealed record WalletSnapshot(
    long UserId,
    int Balance,
    IReadOnlyList<WalletTransaction> RecentTransactions);

public sealed record GiftCatalogItem(
    string Code,
    string Name,
    string Emoji,
    int Price);

public sealed record GiftEvent(
    string Id,
    string RoomCode,
    long SenderUserId,
    string SenderPersonaId,
    string SenderDisplayName,
    string RecipientPersonaId,
    string GiftCode,
    string GiftName,
    string Emoji,
    int Value,
    DateTimeOffset CreatedAt);

public sealed record GiftStoreResult(GiftEvent Event, int Balance, int RecipientBalance);

public sealed record GiftSendResponse(GiftEvent Event, int Balance, int RecipientBalance, bool RealtimeDelivered);
