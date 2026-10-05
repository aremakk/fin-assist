package com.budgetapp.transaction.dto;

import com.budgetapp.common.MoneyType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionRequest(
        @NotNull UUID walletId,
        @NotNull UUID categoryId,
        @NotNull MoneyType type,
        @NotNull @DecimalMin(value = "0.01", inclusive = true) BigDecimal amount,
        @Size(max = 500) String note,
        @NotNull Instant occurredAt
) {
}
