package com.budgetapp.insight.service;

import com.budgetapp.common.MoneyType;
import com.budgetapp.insight.dto.ProactiveResponse;
import com.budgetapp.insight.dto.ProactiveResponse.ProactiveAlert;
import com.budgetapp.stats.dto.CategoryStatResponse;
import com.budgetapp.stats.dto.DayStatResponse;
import com.budgetapp.stats.dto.SummaryResponse;
import com.budgetapp.stats.service.StatsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ProactiveService {

    private final StatsService statsService;

    public ProactiveService(StatsService statsService) {
        this.statsService = statsService;
    }

    @Transactional(readOnly = true)
    public ProactiveResponse proactive(UUID userId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        Instant monthFrom = today.withDayOfMonth(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant monthTo = today.atTime(23, 59, 59).toInstant(ZoneOffset.UTC);
        Instant lookbackFrom = today.minusDays(30).atStartOfDay().toInstant(ZoneOffset.UTC);

        SummaryResponse month = statsService.summary(userId, monthFrom, monthTo, null);
        List<DayStatResponse> days = statsService.byDay(userId, lookbackFrom, monthTo, null);
        List<CategoryStatResponse> cats = statsService.byCategory(
                userId, monthFrom, monthTo, MoneyType.EXPENSE, null);

        List<ProactiveAlert> alerts = new ArrayList<>();

        // Today vs median daily expense (excluding today)
        BigDecimal todayExpense = days.stream()
                .filter(d -> d.date().equals(today))
                .map(DayStatResponse::expenses)
                .findFirst()
                .orElse(BigDecimal.ZERO);

        List<BigDecimal> pastExpenses = days.stream()
                .filter(d -> d.date().isBefore(today))
                .map(DayStatResponse::expenses)
                .filter(e -> e.compareTo(BigDecimal.ZERO) > 0)
                .sorted()
                .toList();

        if (!pastExpenses.isEmpty() && todayExpense.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal median = median(pastExpenses);
            if (median.compareTo(BigDecimal.ZERO) > 0
                    && todayExpense.compareTo(median.multiply(BigDecimal.valueOf(2))) > 0) {
                alerts.add(new ProactiveAlert(
                        "spike-today",
                        "warning",
                        "Сегодня расходы выше обычного",
                        "Сегодня уже %s ₸ при обычных ~%s ₸ в день.".formatted(
                                money(todayExpense), money(median)),
                        Map.of("type", "NAVIGATE", "route", "Stats")
                ));
            }
        }

        // Top category dominating month
        if (!cats.isEmpty() && month.expenses().compareTo(BigDecimal.ZERO) > 0) {
            CategoryStatResponse top = cats.getFirst();
            BigDecimal share = top.amount()
                    .multiply(BigDecimal.valueOf(100))
                    .divide(month.expenses(), 0, RoundingMode.HALF_UP);
            if (share.compareTo(BigDecimal.valueOf(45)) >= 0) {
                alerts.add(new ProactiveAlert(
                        "cat-dominant-" + top.categoryId(),
                        "info",
                        "Много уходит на «" + top.categoryName() + "»",
                        share + "% расходов месяца — в этой категории (" + money(top.amount()) + " ₸).",
                        Map.of("type", "NAVIGATE", "route", "Stats")
                ));
            }
        }

        // Negative net
        if (month.net().compareTo(BigDecimal.ZERO) < 0) {
            alerts.add(new ProactiveAlert(
                    "negative-net",
                    "warning",
                    "Расходы выше доходов",
                    "За месяц минус %s ₸. Могу подсказать, где срезать.".formatted(money(month.net().abs())),
                    Map.of("type", "NAVIGATE", "route", "Insights")
            ));
        }

        // Gentle default tip if quiet
        if (alerts.isEmpty() && month.expenses().compareTo(BigDecimal.ZERO) > 0) {
            alerts.add(new ProactiveAlert(
                    "ok-month",
                    "info",
                    "Держите курс",
                    "За месяц расходов %s ₸. Скажите «запиши …», если нужно добавить операцию.".formatted(
                            money(month.expenses())),
                    null
            ));
        }

        return new ProactiveResponse(alerts.stream().limit(3).toList());
    }

    private static BigDecimal median(List<BigDecimal> sorted) {
        int n = sorted.size();
        if (n == 0) return BigDecimal.ZERO;
        if (n % 2 == 1) return sorted.get(n / 2);
        return sorted.get(n / 2 - 1).add(sorted.get(n / 2))
                .divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
    }

    private static String money(BigDecimal v) {
        return v.setScale(0, RoundingMode.HALF_UP).toPlainString();
    }
}
