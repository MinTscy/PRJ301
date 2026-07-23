package com.lucy.lms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class RealtimeRoomEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(RealtimeRoomEventPublisher.class);

    private final String realtimeBaseUrl;
    private final String internalServiceSecret;
    private final ObjectMapper objectMapper;

    public RealtimeRoomEventPublisher(
            @Value("${lucy.realtime.base-url:http://127.0.0.1:3001}") String realtimeBaseUrl,
            @Value("${lucy.internal-service-secret}") String internalServiceSecret,
            ObjectMapper objectMapper
    ) {
        this.realtimeBaseUrl = stripTrailingSlash(realtimeBaseUrl);
        this.internalServiceSecret = internalServiceSecret;
        this.objectMapper = objectMapper;
    }

    public void publishMaterialsChanged(String roomCode, String action, Long materialId) {
        try {
            byte[] payload = objectMapper.writeValueAsBytes(Map.of(
                    "action", action,
                    "materialId", materialId
            ));
            String encodedRoomCode = URLEncoder.encode(roomCode, StandardCharsets.UTF_8);
            URI uri = URI.create(realtimeBaseUrl + "/internal/rooms/" + encodedRoomCode + "/materials/changed");
            HttpURLConnection connection = (HttpURLConnection) uri.toURL().openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(3000);
            connection.setReadTimeout(3000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("X-LUCY-INTERNAL-SECRET", internalServiceSecret);
            connection.getOutputStream().write(payload);

            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IOException("Realtime service returned status " + status);
            }
            connection.disconnect();
        } catch (IOException | RuntimeException exception) {
            log.warn("Unable to publish material change event for room {}", roomCode, exception);
        }
    }

    private static String stripTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
