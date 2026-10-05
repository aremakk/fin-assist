package com.budgetapp.stats.dto;

import com.budgetapp.common.MoneyType;

import java.math.BigDecimal;
import java.util.UUID;

public record CategoryStatResponse(
        UUID categoryId,
        String categoryName,
        String color,
        MoneyType type,
        BigDecimal amount
) {
}
