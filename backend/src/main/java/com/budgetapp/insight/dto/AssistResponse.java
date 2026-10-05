package com.budgetapp.insight.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AssistResponse(
        String reply,
        List<String> hints,
        List<AssistAction> actions
) {
    public record AssistAction(
            String type,
            Boolean needsConfirm,
            TransactionDraft draft,
            String route,
            Map<String, String> params,
            String text
    ) {
    }

    public record TransactionDraft(
            BigDecimal amount,
            String type,
            String note,
            UUID categoryId,
            String categoryName,
            UUID walletId,
            String walletName
    ) {
    }
}
