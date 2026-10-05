package com.budgetapp.insight.gemini;

import com.budgetapp.common.exception.ApiException;
import com.budgetapp.config.GeminiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public GeminiClient(GeminiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl() != null && !properties.baseUrl().isBlank()
                        ? properties.baseUrl()
                        : "https://generativelanguage.googleapis.com/v1beta")
                .build();
    }

    public void ensureConfigured() {
        if (!properties.isConfigured()) {
            throw ApiException.serviceUnavailable(
                    "Gemini не настроен. Укажите GEMINI_API_KEY на сервере.");
        }
    }

    public String generateJson(String systemInstruction, String userPrompt) {
        ensureConfigured();

        Map<String, Object> body = Map.of(
                "system_instruction", Map.of(
                        "parts", List.of(Map.of("text", systemInstruction))
                ),
                "contents", List.of(
                        Map.of("role", "user", "parts", List.of(Map.of("text", userPrompt)))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.4,
                        "responseMimeType", "application/json"
                )
        );

        try {
            String raw = restClient.post()
                    .uri("/models/{model}:generateContent?key={key}", properties.model(), properties.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            if (raw == null || raw.isBlank()) {
                throw ApiException.serviceUnavailable("Пустой ответ от Gemini");
            }

            JsonNode root = objectMapper.readTree(raw);
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (textNode.isMissingNode() || textNode.asText().isBlank()) {
                JsonNode block = root.path("promptFeedback").path("blockReason");
                if (!block.isMissingNode()) {
                    throw ApiException.serviceUnavailable("Gemini отклонил запрос: " + block.asText());
                }
                throw ApiException.serviceUnavailable("Gemini не вернул текст");
            }
            return textNode.asText();
        } catch (ApiException e) {
            throw e;
        } catch (RestClientResponseException e) {
            log.warn("Gemini HTTP error {}: {}", e.getStatusCode().value(), e.getResponseBodyAsString());
            throw ApiException.serviceUnavailable("Ошибка Gemini API (" + e.getStatusCode().value() + ")");
        } catch (Exception e) {
            log.warn("Gemini call failed: {}", e.getMessage());
            throw ApiException.serviceUnavailable("Не удалось получить ответ от Gemini");
        }
    }
}
