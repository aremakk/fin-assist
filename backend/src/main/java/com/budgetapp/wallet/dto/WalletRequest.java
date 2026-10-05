package com.budgetapp.wallet.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record WalletRequest(
        @NotBlank @Size(min = 1, max = 120) String name,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal initialBalance
) {
}
