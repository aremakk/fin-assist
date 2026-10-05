package com.budgetapp.insight.dto;

import jakarta.validation.constraints.Size;

public record AssistRequest(
        @Size(max = 500) String message,
        @Size(max = 40) String screen
) {
}
