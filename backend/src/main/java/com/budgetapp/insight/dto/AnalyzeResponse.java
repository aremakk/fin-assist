package com.budgetapp.insight.dto;

import java.util.List;

public record AnalyzeResponse(
        String headline,
        String summary,
        List<String> highlights,
        List<String> risks,
        List<String> tips,
        List<String> topCategories
) {
}
