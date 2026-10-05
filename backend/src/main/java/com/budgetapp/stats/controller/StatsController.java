package com.budgetapp.stats.controller;

import com.budgetapp.common.MoneyType;
import com.budgetapp.security.SecurityUtils;
import com.budgetapp.stats.dto.CategoryStatResponse;
import com.budgetapp.stats.dto.DayStatResponse;
import com.budgetapp.stats.dto.SummaryResponse;
import com.budgetapp.stats.service.StatsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/summary")
    public SummaryResponse summary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) UUID walletId
    ) {
        return statsService.summary(SecurityUtils.currentUserId(), from, to, walletId);
    }

    @GetMapping("/by-category")
    public List<CategoryStatResponse> byCategory(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) MoneyType type,
            @RequestParam(required = false) UUID walletId
    ) {
        return statsService.byCategory(SecurityUtils.currentUserId(), from, to, type, walletId);
    }

    @GetMapping("/by-day")
    public List<DayStatResponse> byDay(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) UUID walletId
    ) {
        return statsService.byDay(SecurityUtils.currentUserId(), from, to, walletId);
    }
}
