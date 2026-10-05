package com.budgetapp.stats.service;

import com.budgetapp.category.entity.Category;
import com.budgetapp.category.repository.CategoryRepository;
import com.budgetapp.common.MoneyType;
import com.budgetapp.common.exception.ApiException;
import com.budgetapp.stats.dto.CategoryStatResponse;
import com.budgetapp.stats.dto.DayStatResponse;
import com.budgetapp.stats.dto.SummaryResponse;
import com.budgetapp.transaction.repository.TransactionRepository;
import com.budgetapp.wallet.repository.WalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class StatsService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final WalletRepository walletRepository;

    public StatsService(
            TransactionRepository transactionRepository,
            CategoryRepository categoryRepository,
            WalletRepository walletRepository
    ) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.walletRepository = walletRepository;
    }

    @Transactional(readOnly = true)
    public SummaryResponse summary(UUID userId, Instant from, Instant to, UUID walletId) {
        Period period = resolvePeriod(from, to);
        validateWallet(userId, walletId);

        BigDecimal incomes = transactionRepository.sumByTypeInPeriod(
                userId, MoneyType.INCOME, walletId, period.from(), period.to());
        BigDecimal expenses = transactionRepository.sumByTypeInPeriod(
                userId, MoneyType.EXPENSE, walletId, period.from(), period.to());

        return new SummaryResponse(period.from(), period.to(), incomes, expenses, incomes.subtract(expenses));
    }

    @Transactional(readOnly = true)
    public List<CategoryStatResponse> byCategory(
            UUID userId,
            Instant from,
            Instant to,
            MoneyType type,
            UUID walletId
    ) {
        Period period = resolvePeriod(from, to);
        validateWallet(userId, walletId);
        MoneyType effectiveType = type != null ? type : MoneyType.EXPENSE;

        Map<UUID, Category> categories = categoryRepository.findAllByUserIdOrderByTypeAscNameAsc(userId).stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));

        List<CategoryStatResponse> result = new ArrayList<>();
        for (Object[] row : transactionRepository.sumGroupedByCategory(
                userId, effectiveType, walletId, period.from(), period.to())) {
            UUID categoryId = (UUID) row[0];
            BigDecimal amount = (BigDecimal) row[1];
            Category category = categories.get(categoryId);
            result.add(new CategoryStatResponse(
                    categoryId,
                    category != null ? category.getName() : "Удаленная",
                    category != null ? category.getColor() : "#6B7280",
                    effectiveType,
                    amount
            ));
        }
        result.sort((a, b) -> b.amount().compareTo(a.amount()));
        return result;
    }

    @Transactional(readOnly = true)
    public List<DayStatResponse> byDay(UUID userId, Instant from, Instant to, UUID walletId) {
        Period period = resolvePeriod(from, to);
        validateWallet(userId, walletId);

        List<DayStatResponse> result = new ArrayList<>();
        for (Object[] row : transactionRepository.sumGroupedByDay(userId, walletId, period.from(), period.to())) {
            LocalDate day = toLocalDate(row[0]);
            BigDecimal incomes = toBigDecimal(row[1]);
            BigDecimal expenses = toBigDecimal(row[2]);
            result.add(new DayStatResponse(day, incomes, expenses, incomes.subtract(expenses)));
        }
        return result;
    }

    private void validateWallet(UUID userId, UUID walletId) {
        if (walletId != null && !walletRepository.existsByIdAndUserId(walletId, userId)) {
            throw ApiException.notFound("Кошелёк не найден");
        }
    }

    private Period resolvePeriod(Instant from, Instant to) {
        Instant effectiveFrom = from;
        Instant effectiveTo = to;
        if (effectiveFrom == null || effectiveTo == null) {
            throw ApiException.badRequest("Параметры from и to обязательны");
        }
        if (effectiveFrom.isAfter(effectiveTo)) {
            throw ApiException.badRequest("from не может быть позже to");
        }
        return new Period(effectiveFrom, effectiveTo);
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof Date date) {
            return date.toLocalDate();
        }
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        return LocalDate.parse(value.toString());
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        return new BigDecimal(value.toString());
    }

    private record Period(Instant from, Instant to) {
    }
}
