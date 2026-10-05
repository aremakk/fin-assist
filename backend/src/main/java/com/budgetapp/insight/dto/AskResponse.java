package com.budgetapp.insight.dto;

import java.util.List;

public record AskResponse(
        String answer,
        List<String> bullets
) {
}
