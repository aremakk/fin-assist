package com.budgetapp.category.dto;

import com.budgetapp.common.MoneyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank @Size(min = 1, max = 120) String name,
        @NotNull MoneyType type,
        @Size(max = 64) String icon,
        @Size(max = 32) String color
) {
}
