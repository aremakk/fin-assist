package com.budgetapp.transaction.dto;

import com.budgetapp.common.MoneyType;
import com.budgetapp.transaction.entity.Transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        UUID walletId,
        UUID categoryId,
        MoneyType type,
        BigDecimal amount,
        String note,
        Instant occurredAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static TransactionResponse from(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getWalletId(),
                transaction.getCategoryId(),
                transaction.getType(),
                transaction.getAmount(),
                transaction.getNote(),
                transaction.getOccurredAt(),
                transaction.getCreatedAt(),
                transaction.getUpdatedAt()
        );
    }
}
