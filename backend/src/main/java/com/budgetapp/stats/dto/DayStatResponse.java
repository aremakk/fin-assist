package com.budgetapp.stats.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DayStatResponse(
        LocalDate date,
        BigDecimal incomes,
        BigDecimal expenses,
        BigDecimal net
) {
}
