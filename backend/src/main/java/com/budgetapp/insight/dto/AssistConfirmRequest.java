package com.budgetapp.insight.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record AssistConfirmRequest(
        @NotBlank String type,
        @Valid @NotNull TransactionDraftPayload draft
) {
    public record TransactionDraftPayload(
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotBlank String type,
            String note,
            UUID categoryId,
            UUID walletId
    ) {
    }
}
