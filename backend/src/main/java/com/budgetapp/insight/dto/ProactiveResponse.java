package com.budgetapp.insight.dto;

import java.util.List;
import java.util.Map;

public record ProactiveResponse(
        List<ProactiveAlert> alerts
) {
    public record ProactiveAlert(
            String id,
            String severity,
            String title,
            String body,
            Map<String, String> action
    ) {
    }
}
