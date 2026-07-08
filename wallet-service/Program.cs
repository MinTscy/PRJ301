using Lucy.WalletService;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(builder.Configuration["FrontendOrigin"] ?? "http://localhost:3000")
    .AllowAnyHeader()
    .AllowAnyMethod()));
builder.Services.AddHttpClient<JavaAuthClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["JavaLmsBaseUrl"] ?? "http://localhost:8080"));
builder.Services.AddHttpClient<RealtimeGiftClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["RealtimeBaseUrl"] ?? "http://localhost:3001"));
builder.Services.AddSingleton(new WalletStore(
    builder.Configuration.GetConnectionString("Wallet") ?? "Data Source=data/lucy-wallet.db"));

var app = builder.Build();
app.UseCors();

var store = app.Services.GetRequiredService<WalletStore>();
await store.InitializeAsync();

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (UnauthorizedAccessException exception)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await context.Response.WriteAsJsonAsync(new { message = exception.Message });
    }
    catch (ArgumentException exception)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { message = exception.Message });
    }
    catch (InvalidOperationException exception)
    {
        context.Response.StatusCode = StatusCodes.Status409Conflict;
        await context.Response.WriteAsJsonAsync(new { message = exception.Message });
    }
});

app.MapGet("/health", () => Results.Ok(new
{
    status = "UP",
    service = "lucy-wallet-service",
    paymentMode = "SANDBOX"
}));

app.MapGet("/api/gifts/catalog", (WalletStore wallets) => wallets.GetGiftCatalogAsync());

app.MapGet("/api/wallet", async (HttpRequest request, JavaAuthClient auth, WalletStore wallets) =>
{
    var user = await auth.GetCurrentUserAsync(request.Headers.Authorization);
    return Results.Ok(await wallets.GetWalletAsync(user));
});

app.MapGet("/api/wallet/transactions", async (HttpRequest request, JavaAuthClient auth, WalletStore wallets) =>
{
    var user = await auth.GetCurrentUserAsync(request.Headers.Authorization);
    return Results.Ok(await wallets.GetTransactionsAsync(user.Id));
});

app.MapPost("/api/topups", async (
    TopUpRequest payload,
    HttpRequest request,
    JavaAuthClient auth,
    WalletStore wallets) =>
{
    var user = await auth.GetCurrentUserAsync(request.Headers.Authorization);
    return Results.Ok(await wallets.TopUpAsync(user, payload));
});

app.MapPost("/api/gifts/send", async (
    SendGiftRequest payload,
    HttpRequest request,
    JavaAuthClient auth,
    WalletStore wallets,
    RealtimeGiftClient realtime) =>
{
    var user = await auth.GetCurrentUserAsync(request.Headers.Authorization);
    var recipient = await auth.GetUserByPersonaIdAsync(payload.RecipientPersonaId);
    await realtime.ValidateTransferAsync(payload.RoomCode, user.PersonaId, recipient.PersonaId);
    var result = await wallets.SendGiftAsync(user, recipient, payload);
    var delivered = await realtime.PublishAsync(result.Event);
    return Results.Ok(new GiftSendResponse(result.Event, result.Balance, result.RecipientBalance, delivered));
});

app.MapGet("/api/gifts/rooms/{roomCode}", (string roomCode, WalletStore wallets) =>
    wallets.GetRoomGiftsAsync(roomCode));

app.Run();

public partial class Program;
