package com.budgetapp.insight.dto;

import com.budgetapp.transaction.dto.TransactionResponse;

public record AssistConfirmResponse(
        String reply,
        TransactionResponse transaction
) {
}
