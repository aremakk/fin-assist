package com.budgetapp.insight.service;

import com.budgetapp.category.entity.Category;
import com.budgetapp.category.repository.CategoryRepository;
import com.budgetapp.common.MoneyType;
import com.budgetapp.common.exception.ApiException;
import com.budgetapp.stats.dto.CategoryStatResponse;
import com.budgetapp.stats.dto.DayStatResponse;
import com.budgetapp.stats.dto.SummaryResponse;
import com.budgetapp.stats.service.StatsService;
import com.budgetapp.transaction.entity.Transaction;
import com.budgetapp.transaction.repository.TransactionRepository;
import com.budgetapp.transaction.repository.TransactionSpecs;
import com.budgetapp.wallet.entity.Wallet;
import com.budgetapp.wallet.repository.WalletRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class InsightContextBuilder {

    private static final int MAX_TRANSACTIONS = 40;

    private final StatsService statsService;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final WalletRepository walletRepository;
    private final ObjectMapper objectMapper;

    public InsightContextBuilder(
            StatsService statsService,
            TransactionRepository transactionRepository,
            CategoryRepository categoryRepository,
            WalletRepository walletRepository,
            ObjectMapper objectMapper
    ) {
        this.statsService = statsService;
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.walletRepository = walletRepository;
        this.objectMapper = objectMapper;
    }

    public String buildFinanceContext(UUID userId, Instant from, Instant to, UUID walletId) {
        if (from == null || to == null) {
            throw ApiException.badRequest("Параметры from и to обязательны");
        }
        if (from.isAfter(to)) {
            throw ApiException.badRequest("from не может быть позже to");
        }
        if (walletId != null && !walletRepository.existsByIdAndUserId(walletId, userId)) {
            throw ApiException.notFound("Кошелёк не найден");
        }

        SummaryResponse summary = statsService.summary(userId, from, to, walletId);
        List<CategoryStatResponse> byCategory = statsService.byCategory(
                userId, from, to, MoneyType.EXPENSE, walletId);
        List<DayStatResponse> byDay = statsService.byDay(userId, from, to, walletId);

        Map<UUID, Category> categories = categoryRepository.findAllByUserIdOrderByTypeAscNameAsc(userId).stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));
        Map<UUID, Wallet> wallets = walletRepository.findAllByUserIdOrderByCreatedAtAsc(userId).stream()
                .collect(Collectors.toMap(Wallet::getId, Function.identity()));

        List<Transaction> recent = transactionRepository.findAll(
                TransactionSpecs.search(userId, from, to, null, null, walletId, null),
                PageRequest.of(0, MAX_TRANSACTIONS, Sort.by(Sort.Direction.DESC, "occurredAt"))
        ).getContent();

        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("currency", "KZT");
            root.put("from", from.toString());
            root.put("to", to.toString());

            ObjectNode summaryNode = root.putObject("summary");
            summaryNode.put("incomes", summary.incomes());
            summaryNode.put("expenses", summary.expenses());
            summaryNode.put("net", summary.net());

            ArrayNode catArr = root.putArray("expensesByCategory");
            for (CategoryStatResponse c : byCategory) {
                ObjectNode n = catArr.addObject();
                n.put("categoryId", c.categoryId().toString());
                n.put("name", c.categoryName());
                n.put("amount", c.amount());
            }

            ArrayNode dayArr = root.putArray("byDay");
            for (DayStatResponse d : byDay) {
                ObjectNode n = dayArr.addObject();
                n.put("date", d.date().toString());
                n.put("incomes", d.incomes());
                n.put("expenses", d.expenses());
                n.put("net", d.net());
            }

            ArrayNode txArr = root.putArray("recentTransactions");
            for (Transaction t : recent) {
                ObjectNode n = txArr.addObject();
                n.put("type", t.getType().name());
                n.put("amount", t.getAmount());
                n.put("occurredAt", t.getOccurredAt().toString());
                Category cat = categories.get(t.getCategoryId());
                n.put("category", cat != null ? cat.getName() : "Удаленная");
                Wallet w = wallets.get(t.getWalletId());
                n.put("wallet", w != null ? w.getName() : "—");
                if (t.getNote() != null && !t.getNote().isBlank()) {
                    n.put("note", t.getNote());
                }
            }

            ArrayNode available = root.putArray("availableCategories");
            for (Category c : categories.values()) {
                ObjectNode n = available.addObject();
                n.put("id", c.getId().toString());
                n.put("name", c.getName());
                n.put("type", c.getType().name());
            }

            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (Exception e) {
            throw ApiException.serviceUnavailable("Не удалось собрать финансовый контекст");
        }
    }

    public String buildCategoriesJson(UUID userId, MoneyType type) {
        List<Category> list = categoryRepository.findAllByUserIdAndTypeOrderByNameAsc(userId, type);
        try {
            ArrayNode arr = objectMapper.createArrayNode();
            for (Category c : list) {
                ObjectNode n = arr.addObject();
                n.put("id", c.getId().toString());
                n.put("name", c.getName());
            }
            return objectMapper.writeValueAsString(arr);
        } catch (Exception e) {
            throw ApiException.serviceUnavailable("Не удалось собрать категории");
        }
    }
}
