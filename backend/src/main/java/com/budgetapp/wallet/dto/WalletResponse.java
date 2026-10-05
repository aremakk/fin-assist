package com.budgetapp.wallet.dto;

import com.budgetapp.wallet.entity.Wallet;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WalletResponse(
        UUID id,
        String name,
        String currency,
        BigDecimal initialBalance,
        Instant createdAt,
        Instant updatedAt
) {
    public static WalletResponse from(Wallet wallet) {
        return new WalletResponse(
                wallet.getId(),
                wallet.getName(),
                wallet.getCurrency(),
                wallet.getInitialBalance(),
                wallet.getCreatedAt(),
                wallet.getUpdatedAt()
        );
    }
}
