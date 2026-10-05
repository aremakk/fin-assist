package com.budgetapp.insight.dto;

import java.util.UUID;

public record SuggestCategoryResponse(
        UUID categoryId,
        String categoryName,
        double confidence
) {
}
