package com.budgetapp.insight.dto;

import com.budgetapp.common.MoneyType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record SuggestCategoryRequest(
        @NotNull MoneyType type,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @Size(max = 500) String note,
        UUID walletId
) {
}
