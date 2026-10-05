package com.budgetapp.insight.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record AskRequest(
        @NotBlank @Size(max = 500) String question,
        Instant from,
        Instant to,
        UUID walletId
) {
}
