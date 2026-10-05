package com.budgetapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.gemini")
public record GeminiProperties(
        boolean enabled,
        String apiKey,
        String model,
        String baseUrl
) {
    public boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }
}
