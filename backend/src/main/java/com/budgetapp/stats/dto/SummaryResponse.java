package com.budgetapp.stats.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record SummaryResponse(
        Instant from,
        Instant to,
        BigDecimal incomes,
        BigDecimal expenses,
        BigDecimal net
) {
}
