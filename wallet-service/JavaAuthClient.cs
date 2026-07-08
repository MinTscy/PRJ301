using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace Lucy.WalletService;

public sealed class JavaAuthClient(HttpClient client, IConfiguration configuration)
{
    public async Task<AuthUser> GetCurrentUserAsync(string? authorizationHeader)
    {
        if (!AuthenticationHeaderValue.TryParse(authorizationHeader, out var authorization) ||
            !authorization.Scheme.Equals("Bearer", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(authorization.Parameter))
        {
            throw new UnauthorizedAccessException("Missing Authorization bearer token.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        request.Headers.Authorization = authorization;
        using var response = await client.SendAsync(request);
        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            throw new UnauthorizedAccessException("Access token is invalid or expired.");
        }
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<AuthUser>()
               ?? throw new UnauthorizedAccessException("Auth service returned an empty user.");
    }

    public async Task<AuthUser> GetUserByPersonaIdAsync(string personaId)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/api/auth/internal/personas/{Uri.EscapeDataString(personaId.Trim())}");
        request.Headers.Add(
            "X-LUCY-INTERNAL-SECRET",
            configuration["InternalServiceSecret"] ?? "lucy-local-internal-secret");
        using var response = await client.SendAsync(request);
        if (response.StatusCode == HttpStatusCode.NotFound)
            throw new ArgumentException("Gift recipient account was not found.");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<AuthUser>()
               ?? throw new ArgumentException("Auth service returned an empty gift recipient.");
    }
}
