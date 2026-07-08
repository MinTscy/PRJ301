using System.Net.Http.Json;

namespace Lucy.WalletService;

public sealed class RealtimeGiftClient(HttpClient client, IConfiguration configuration, ILogger<RealtimeGiftClient> logger)
{
    public async Task ValidateTransferAsync(string roomCode, string senderPersonaId, string recipientPersonaId)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/internal/gifts/validate")
        {
            Content = JsonContent.Create(new { roomCode, senderPersonaId, recipientPersonaId })
        };
        request.Headers.Add(
            "X-LUCY-INTERNAL-SECRET",
            configuration["InternalServiceSecret"] ?? "lucy-local-internal-secret");
        using var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
            throw new InvalidOperationException(error?.Message ?? "Gift transfer is not allowed in this room.");
        }
    }

    public async Task<bool> PublishAsync(GiftEvent giftEvent)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/internal/gifts")
            {
                Content = JsonContent.Create(giftEvent)
            };
            request.Headers.Add(
                "X-LUCY-INTERNAL-SECRET",
                configuration["InternalServiceSecret"] ?? "lucy-local-internal-secret");
            using var response = await client.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Gift was persisted but realtime delivery failed for {GiftId}", giftEvent.Id);
            return false;
        }
    }

    private sealed record ErrorResponse(string Message);
}
