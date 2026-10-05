package com.budgetapp.category.dto;

import com.budgetapp.category.entity.Category;
import com.budgetapp.common.MoneyType;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.UUID;

public record CategoryResponse(
        UUID id,
        String name,
        MoneyType type,
        String icon,
        String color,
        @JsonProperty("isSystem") boolean isSystem,
        Instant createdAt,
        Instant updatedAt
) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getType(),
                category.getIcon(),
                category.getColor(),
                category.isSystem(),
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}
