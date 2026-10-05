package com.budgetapp.insight.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public record AnalyzeRequest(
        @NotNull Instant from,
        @NotNull Instant to,
        UUID walletId
) {
}
