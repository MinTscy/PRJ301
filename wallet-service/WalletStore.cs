using Microsoft.Data.Sqlite;

namespace Lucy.WalletService;

public sealed class WalletStore(string connectionString)
{
    private readonly SemaphoreSlim _writeLock = new(1, 1);

    public async Task InitializeAsync()
    {
        var builder = new SqliteConnectionStringBuilder(connectionString);
        if (!string.IsNullOrWhiteSpace(builder.DataSource) && builder.DataSource != ":memory:")
        {
            var directory = Path.GetDirectoryName(Path.GetFullPath(builder.DataSource));
            if (directory is not null) Directory.CreateDirectory(directory);
        }

        await using var connection = CreateConnection();
        await connection.OpenAsync();
        var command = connection.CreateCommand();
        command.CommandText = """
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS wallets (
                user_id INTEGER PRIMARY KEY,
                balance INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                reference TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user
                ON wallet_transactions(user_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS gift_catalog (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                emoji TEXT NOT NULL,
                price INTEGER NOT NULL CHECK(price > 0)
            );
            CREATE TABLE IF NOT EXISTS gift_events (
                id TEXT PRIMARY KEY,
                room_code TEXT NOT NULL,
                sender_user_id INTEGER NOT NULL,
                sender_persona_id TEXT NOT NULL,
                sender_display_name TEXT NOT NULL,
                recipient_persona_id TEXT NOT NULL,
                gift_code TEXT NOT NULL,
                gift_name TEXT NOT NULL,
                emoji TEXT NOT NULL,
                value INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_gift_events_room
                ON gift_events(room_code, created_at DESC);
            INSERT OR IGNORE INTO gift_catalog(code, name, emoji, price) VALUES
                ('APPLAUSE', 'Applause', '👏', 10),
                ('COFFEE', 'Coffee', '☕', 25),
                ('STAR', 'Super Star', '⭐', 50),
                ('ROCKET', 'Rocket', '🚀', 100);
            """;
        await command.ExecuteNonQueryAsync();
    }

    public async Task<WalletSnapshot> GetWalletAsync(AuthUser user)
    {
        await EnsureWalletAsync(user.Id);
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        var balanceCommand = connection.CreateCommand();
        balanceCommand.CommandText = "SELECT balance FROM wallets WHERE user_id = $userId";
        balanceCommand.Parameters.AddWithValue("$userId", user.Id);
        var balance = Convert.ToInt32(await balanceCommand.ExecuteScalarAsync());
        return new WalletSnapshot(user.Id, balance, await GetTransactionsAsync(user.Id));
    }

    public async Task<IReadOnlyList<WalletTransaction>> GetTransactionsAsync(long userId)
    {
        var results = new List<WalletTransaction>();
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        var command = connection.CreateCommand();
        command.CommandText = """
            SELECT id, type, amount, reference, created_at
            FROM wallet_transactions WHERE user_id = $userId
            ORDER BY created_at DESC LIMIT 50
            """;
        command.Parameters.AddWithValue("$userId", userId);
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            results.Add(new WalletTransaction(
                reader.GetString(0), reader.GetString(1), reader.GetInt32(2), reader.GetString(3),
                DateTimeOffset.Parse(reader.GetString(4))));
        }
        return results;
    }

    public async Task<WalletSnapshot> TopUpAsync(AuthUser user, TopUpRequest request)
    {
        if (request.Amount is < 10 or > 1_000_000)
            throw new ArgumentException("Top-up amount must be between 10 and 1,000,000 Lucy Points.");
        var provider = request.Provider?.Trim().ToUpperInvariant() ?? "";
        if (provider is not ("SANDBOX" or "MOCK_MOMO" or "MOCK_VNPAY"))
            throw new ArgumentException("Only sandbox payment providers are enabled.");
        var idempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey)
            ? null
            : request.IdempotencyKey.Trim();
        if (idempotencyKey is { Length: > 100 } ||
            idempotencyKey is not null && !idempotencyKey.All(character =>
                char.IsLetterOrDigit(character) || character is '-' or '_'))
            throw new ArgumentException("Idempotency key must contain only letters, numbers, hyphens, or underscores.");

        await _writeLock.WaitAsync();
        try
        {
            await using var connection = CreateConnection();
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();
            var now = DateTimeOffset.UtcNow;
            await EnsureWalletAsync(connection, transaction, user.Id, now);
            var transactionId = idempotencyKey is null
                ? Guid.NewGuid().ToString("N")
                : $"topup_{user.Id}_{idempotencyKey}";
            var existing = await FindTopUpAsync(connection, transaction, transactionId, user.Id);
            if (existing is not null)
            {
                if (existing.Value.Amount != request.Amount || existing.Value.Provider != provider)
                    throw new InvalidOperationException("This top-up key was already used with different details.");
                await transaction.RollbackAsync();
            }
            else
            {
                await ExecuteAsync(connection, transaction,
                    "UPDATE wallets SET balance = balance + $amount, updated_at = $now WHERE user_id = $userId",
                    ("$amount", request.Amount), ("$now", now.ToString("O")), ("$userId", user.Id));
                await ExecuteAsync(connection, transaction, """
                    INSERT INTO wallet_transactions(id, user_id, type, amount, reference, created_at)
                    VALUES($id, $userId, 'TOP_UP', $amount, $reference, $now)
                    """, ("$id", transactionId), ("$userId", user.Id), ("$amount", request.Amount),
                    ("$reference", provider), ("$now", now.ToString("O")));
                await transaction.CommitAsync();
            }
        }
        finally
        {
            _writeLock.Release();
        }
        return await GetWalletAsync(user);
    }

    public async Task<GiftStoreResult> SendGiftAsync(AuthUser user, AuthUser recipient, SendGiftRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RoomCode) || string.IsNullOrWhiteSpace(request.RecipientPersonaId))
            throw new ArgumentException("Room code and recipient persona are required.");
        if (user.Role != "LUCY")
            throw new InvalidOperationException("Only learner accounts can send gifts to a room host.");
        if (recipient.Role is not ("LUCY_PRO" or "LUCY_SUPER"))
            throw new InvalidOperationException("Gifts can only be sent to a Pro or Super room host.");
        if (user.Id == recipient.Id)
            throw new InvalidOperationException("You cannot send a gift to yourself.");

        await _writeLock.WaitAsync();
        try
        {
            await using var connection = CreateConnection();
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();
            var gift = await FindGiftAsync(connection, transaction, request.GiftCode.Trim().ToUpperInvariant())
                       ?? throw new ArgumentException("Gift code was not found.");
            var now = DateTimeOffset.UtcNow;
            await EnsureWalletAsync(connection, transaction, user.Id, now);
            await EnsureWalletAsync(connection, transaction, recipient.Id, now);
            var changed = await ExecuteAsync(connection, transaction, """
                UPDATE wallets SET balance = balance - $price, updated_at = $now
                WHERE user_id = $userId AND balance >= $price
                """, ("$price", gift.Price), ("$now", now.ToString("O")), ("$userId", user.Id));
            if (changed != 1) throw new InvalidOperationException("Wallet balance is not enough for this gift.");
            await ExecuteAsync(connection, transaction, """
                UPDATE wallets SET balance = balance + $price, updated_at = $now
                WHERE user_id = $recipientId
                """, ("$price", gift.Price), ("$now", now.ToString("O")), ("$recipientId", recipient.Id));

            var eventId = Guid.NewGuid().ToString("N");
            var roomCode = request.RoomCode.Trim().ToUpperInvariant();
            var giftEvent = new GiftEvent(eventId, roomCode, user.Id, user.PersonaId, user.DisplayName,
                request.RecipientPersonaId.Trim(), gift.Code, gift.Name, gift.Emoji, gift.Price, now);
            await ExecuteAsync(connection, transaction, """
                INSERT INTO gift_events(id, room_code, sender_user_id, sender_persona_id, sender_display_name,
                    recipient_persona_id, gift_code, gift_name, emoji, value, created_at)
                VALUES($id, $room, $senderId, $senderPersona, $senderName, $recipient, $code, $name, $emoji, $value, $now)
                """, ("$id", eventId), ("$room", roomCode), ("$senderId", user.Id),
                ("$senderPersona", user.PersonaId), ("$senderName", user.DisplayName),
                ("$recipient", request.RecipientPersonaId.Trim()), ("$code", gift.Code),
                ("$name", gift.Name), ("$emoji", gift.Emoji), ("$value", gift.Price), ("$now", now.ToString("O")));
            await ExecuteAsync(connection, transaction, """
                INSERT INTO wallet_transactions(id, user_id, type, amount, reference, created_at)
                VALUES($id, $userId, 'GIFT_SENT', $amount, $reference, $now)
                """, ("$id", Guid.NewGuid().ToString("N")), ("$userId", user.Id), ("$amount", -gift.Price),
                ("$reference", eventId), ("$now", now.ToString("O")));
            await ExecuteAsync(connection, transaction, """
                INSERT INTO wallet_transactions(id, user_id, type, amount, reference, created_at)
                VALUES($id, $userId, 'GIFT_RECEIVED', $amount, $reference, $now)
                """, ("$id", Guid.NewGuid().ToString("N")), ("$userId", recipient.Id), ("$amount", gift.Price),
                ("$reference", eventId), ("$now", now.ToString("O")));
            var balance = await GetBalanceAsync(connection, transaction, user.Id);
            var recipientBalance = await GetBalanceAsync(connection, transaction, recipient.Id);
            await transaction.CommitAsync();
            return new GiftStoreResult(giftEvent, balance, recipientBalance);
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<IReadOnlyList<GiftCatalogItem>> GetGiftCatalogAsync()
    {
        var gifts = new List<GiftCatalogItem>();
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        var command = connection.CreateCommand();
        command.CommandText = "SELECT code, name, emoji, price FROM gift_catalog ORDER BY price";
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) gifts.Add(ReadGift(reader));
        return gifts;
    }

    public async Task<IReadOnlyList<GiftEvent>> GetRoomGiftsAsync(string roomCode)
    {
        var events = new List<GiftEvent>();
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        var command = connection.CreateCommand();
        command.CommandText = """
            SELECT id, room_code, sender_user_id, sender_persona_id, sender_display_name,
                recipient_persona_id, gift_code, gift_name, emoji, value, created_at
            FROM gift_events WHERE room_code = $room ORDER BY created_at DESC LIMIT 100
            """;
        command.Parameters.AddWithValue("$room", roomCode.Trim().ToUpperInvariant());
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) events.Add(new GiftEvent(
            reader.GetString(0), reader.GetString(1), reader.GetInt64(2), reader.GetString(3),
            reader.GetString(4), reader.GetString(5), reader.GetString(6), reader.GetString(7),
            reader.GetString(8), reader.GetInt32(9), DateTimeOffset.Parse(reader.GetString(10))));
        return events;
    }

    private SqliteConnection CreateConnection() => new(connectionString);

    private async Task EnsureWalletAsync(long userId)
    {
        await _writeLock.WaitAsync();
        try
        {
            await using var connection = CreateConnection();
            await connection.OpenAsync();
            await EnsureWalletAsync(connection, null, userId, DateTimeOffset.UtcNow);
        }
        finally { _writeLock.Release(); }
    }

    private static Task<int> EnsureWalletAsync(SqliteConnection connection, System.Data.Common.DbTransaction? transaction,
        long userId, DateTimeOffset now) => ExecuteAsync(connection, transaction, """
        INSERT OR IGNORE INTO wallets(user_id, balance, updated_at) VALUES($userId, 0, $now)
        """, ("$userId", userId), ("$now", now.ToString("O")));

    private static async Task<GiftCatalogItem?> FindGiftAsync(SqliteConnection connection,
        System.Data.Common.DbTransaction transaction, string code)
    {
        var command = connection.CreateCommand();
        command.Transaction = (SqliteTransaction)transaction;
        command.CommandText = "SELECT code, name, emoji, price FROM gift_catalog WHERE code = $code";
        command.Parameters.AddWithValue("$code", code);
        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? ReadGift(reader) : null;
    }

    private static async Task<(int Amount, string Provider)?> FindTopUpAsync(
        SqliteConnection connection,
        System.Data.Common.DbTransaction transaction,
        string transactionId,
        long userId)
    {
        var command = connection.CreateCommand();
        command.Transaction = (SqliteTransaction)transaction;
        command.CommandText = """
            SELECT amount, reference FROM wallet_transactions
            WHERE id = $id AND user_id = $userId AND type = 'TOP_UP'
            """;
        command.Parameters.AddWithValue("$id", transactionId);
        command.Parameters.AddWithValue("$userId", userId);
        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? (reader.GetInt32(0), reader.GetString(1)) : null;
    }

    private static GiftCatalogItem ReadGift(SqliteDataReader reader) =>
        new(reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetInt32(3));

    private static async Task<int> GetBalanceAsync(SqliteConnection connection,
        System.Data.Common.DbTransaction transaction, long userId)
    {
        var command = connection.CreateCommand();
        command.Transaction = (SqliteTransaction)transaction;
        command.CommandText = "SELECT balance FROM wallets WHERE user_id = $userId";
        command.Parameters.AddWithValue("$userId", userId);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    private static async Task<int> ExecuteAsync(SqliteConnection connection,
        System.Data.Common.DbTransaction? transaction, string sql, params (string Name, object Value)[] parameters)
    {
        var command = connection.CreateCommand();
        if (transaction is not null) command.Transaction = (SqliteTransaction)transaction;
        command.CommandText = sql;
        foreach (var parameter in parameters) command.Parameters.AddWithValue(parameter.Name, parameter.Value);
        return await command.ExecuteNonQueryAsync();
    }
}
