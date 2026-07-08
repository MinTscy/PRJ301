using Lucy.WalletService;

namespace Lucy.WalletService.Tests;

public sealed class WalletStoreTests : IAsyncLifetime
{
    private readonly string _databasePath = Path.Combine(Path.GetTempPath(), $"lucy-wallet-{Guid.NewGuid():N}.db");
    private WalletStore _store = null!;
    private static readonly AuthUser User = new(7, "learner@lucy.local", "Learner", "LUCY", "persona-7", true);
    private static readonly AuthUser Host = new(8, "mentor@lucy.local", "Mentor", "LUCY_PRO", "mentor-1", false);

    public async Task InitializeAsync()
    {
        _store = new WalletStore($"Data Source={_databasePath};Pooling=False");
        await _store.InitializeAsync();
    }

    public Task DisposeAsync()
    {
        if (File.Exists(_databasePath)) File.Delete(_databasePath);
        return Task.CompletedTask;
    }

    [Fact]
    public async Task TopUpLucyPointsAndRecordsTransaction()
    {
        var wallet = await _store.TopUpAsync(User, new TopUpRequest(200));

        Assert.Equal(200, wallet.Balance);
        Assert.Contains(wallet.RecentTransactions, item => item.Type == "TOP_UP" && item.Amount == 200);
    }

    [Fact]
    public async Task TopUpWithSameIdempotencyKeyOnlyCreditsOnce()
    {
        var request = new TopUpRequest(200, "SANDBOX", "checkout-123");

        await _store.TopUpAsync(User, request);
        var wallet = await _store.TopUpAsync(User, request);

        Assert.Equal(200, wallet.Balance);
        Assert.Single(wallet.RecentTransactions, item => item.Type == "TOP_UP");
    }

    [Fact]
    public async Task TopUpRejectsReusedKeyWithDifferentAmount()
    {
        await _store.TopUpAsync(User, new TopUpRequest(200, "SANDBOX", "checkout-123"));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _store.TopUpAsync(User, new TopUpRequest(500, "SANDBOX", "checkout-123")));

        Assert.Contains("already used", exception.Message);
    }

    [Fact]
    public async Task SendGiftDebitsWalletAndPersistsRoomEvent()
    {
        await _store.TopUpAsync(User, new TopUpRequest(200));
        var result = await _store.SendGiftAsync(User, Host, new SendGiftRequest("lucy-room", "rocket", "mentor-1"));

        Assert.Equal(100, result.Balance);
        Assert.Equal(100, result.RecipientBalance);
        Assert.Equal(100, (await _store.GetWalletAsync(Host)).Balance);
        Assert.Contains((await _store.GetWalletAsync(Host)).RecentTransactions,
            item => item.Type == "GIFT_RECEIVED" && item.Amount == 100);
        Assert.Equal("LUCY-ROOM", result.Event.RoomCode);
        Assert.Single(await _store.GetRoomGiftsAsync("LUCY-ROOM"));
    }

    [Fact]
    public async Task SendGiftRejectsInsufficientBalance()
    {
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _store.SendGiftAsync(User, Host, new SendGiftRequest("LUCY-ROOM", "STAR", "mentor-1")));

        Assert.Contains("not enough", exception.Message);
    }
}
