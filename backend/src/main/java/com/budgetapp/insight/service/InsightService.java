package com.budgetapp.insight.service;

import com.budgetapp.category.entity.Category;
import com.budgetapp.category.repository.CategoryRepository;
import com.budgetapp.common.MoneyType;
import com.budgetapp.common.exception.ApiException;
import com.budgetapp.insight.dto.AnalyzeResponse;
import com.budgetapp.insight.dto.AskResponse;
import com.budgetapp.insight.dto.SuggestCategoryResponse;
import com.budgetapp.insight.gemini.GeminiClient;
import com.budgetapp.wallet.repository.WalletRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class InsightService {

    private static final String ANALYZE_SYSTEM = """
            Ты финансовый аналитик приложения FinAssist (валюта тенге, KZT).
            Отвечай только валидным JSON без markdown.
            Схема:
            {
              "headline": "короткий заголовок",
              "summary": "2-4 предложения анализа периода",
              "highlights": ["факт 1", "факт 2"],
              "risks": ["риск или предупреждение"],
              "tips": ["практичный совет 1", "совет 2"],
              "topCategories": ["название категории"]
            }
            Пиши по-русски, конкретно, опирайся только на переданные данные.
            Не выдумывай транзакции которых нет. Если данных мало — скажи об этом.
            """;

    private static final String ASK_SYSTEM = """
            Ты помощник FinAssist. Отвечай только на вопросы о финансах пользователя
            на основе JSON-контекста. Валюта — тенге (KZT). Язык — русский.
            Отвечай только валидным JSON:
            { "answer": "полный ответ", "bullets": ["краткий пункт", "..."] }
            Если данных недостаточно — честно скажи. Не давай инвестиционных советов как гарантию.
            """;

    private static final String SUGGEST_SYSTEM = """
            Подбери одну категорию из списка пользователя по заметке и сумме.
            Ответь только JSON:
            { "categoryId": "uuid из списка", "categoryName": "имя", "confidence": 0.0 }
            confidence от 0 до 1. Если не уверен — confidence < 0.4 и всё равно лучший вариант из списка.
            Не придумывай categoryId вне списка.
            """;

    private final GeminiClient geminiClient;
    private final InsightContextBuilder contextBuilder;
    private final CategoryRepository categoryRepository;
    private final WalletRepository walletRepository;
    private final ObjectMapper objectMapper;

    public InsightService(
            GeminiClient geminiClient,
            InsightContextBuilder contextBuilder,
            CategoryRepository categoryRepository,
            WalletRepository walletRepository,
            ObjectMapper objectMapper
    ) {
        this.geminiClient = geminiClient;
        this.contextBuilder = contextBuilder;
        this.categoryRepository = categoryRepository;
        this.walletRepository = walletRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public AnalyzeResponse analyze(UUID userId, Instant from, Instant to, UUID walletId) {
        String context = contextBuilder.buildFinanceContext(userId, from, to, walletId);
        String prompt = "Проанализируй финансы пользователя за период.\n\nДАННЫЕ:\n" + context;
        String json = geminiClient.generateJson(ANALYZE_SYSTEM, prompt);
        return parseAnalyze(json);
    }

    @Transactional(readOnly = true)
    public AskResponse ask(UUID userId, String question, Instant from, Instant to, UUID walletId) {
        String q = question == null ? "" : question.trim();
        if (q.isEmpty()) {
            throw ApiException.badRequest("Вопрос обязателен");
        }
        Period period = resolveAskPeriod(from, to);
        String context = contextBuilder.buildFinanceContext(userId, period.from(), period.to(), walletId);
        String prompt = "Вопрос пользователя: " + q + "\n\nДАННЫЕ:\n" + context;
        String json = geminiClient.generateJson(ASK_SYSTEM, prompt);
        return parseAsk(json);
    }

    @Transactional(readOnly = true)
    public SuggestCategoryResponse suggestCategory(
            UUID userId,
            MoneyType type,
            BigDecimal amount,
            String note,
            UUID walletId
    ) {
        if (walletId != null && !walletRepository.existsByIdAndUserId(walletId, userId)) {
            throw ApiException.notFound("Кошелёк не найден");
        }

        String trimmed = note == null ? "" : note.trim();
        List<Category> categories = categoryRepository.findAllByUserIdAndTypeOrderByNameAsc(userId, type);
        if (categories.isEmpty()) {
            return new SuggestCategoryResponse(null, null, 0);
        }

        if (trimmed.isEmpty()) {
            return new SuggestCategoryResponse(null, null, 0);
        }

        SuggestCategoryResponse local = ruleBasedSuggest(categories, trimmed);
        if (local != null && local.confidence() >= 0.75) {
            return local;
        }

        try {
            geminiClient.ensureConfigured();
        } catch (ApiException e) {
            return local != null ? local : new SuggestCategoryResponse(null, null, 0);
        }

        String catsJson = contextBuilder.buildCategoriesJson(userId, type);
        String prompt = """
                type=%s
                amount=%s
                note=%s
                categories=%s
                """.formatted(type.name(), amount, trimmed, catsJson);

        try {
            String json = geminiClient.generateJson(SUGGEST_SYSTEM, prompt);
            SuggestCategoryResponse parsed = parseSuggest(json, categories);
            if (parsed.confidence() > 0) {
                return parsed;
            }
            return local != null ? local : parsed;
        } catch (ApiException e) {
            return local != null ? local : new SuggestCategoryResponse(null, null, 0);
        }
    }

    private SuggestCategoryResponse ruleBasedSuggest(List<Category> categories, String note) {
        String n = note.toLowerCase(Locale.ROOT);
        Map<String, String[]> keywords = Map.of(
                "Еда", new String[]{"еда", "магазин", "magnum", "small", "продукты", "кафе", "ресторан", "кофе", "обед"},
                "Транспорт", new String[]{"такси", "яндекс", "uber", "метро", "автобус", "бензин", "заправк", "транспорт"},
                "Жильё", new String[]{"аренда", "квартира", "коммунал", "свет", "вода", "жильё", "квартир"},
                "Развлечения", new String[]{"кино", "игра", "подписк", "spotify", "netflix", "развлеч"},
                "Здоровье", new String[]{"аптека", "врач", "клиник", "лекарств", "здоров"},
                "Покупки", new String[]{"wb", "wildberries", "ozon", "amazon", "покупк", "одежд"},
                "Зарплата", new String[]{"зарплат", "оклад", "salary"},
                "Подработка", new String[]{"фриланс", "подработ", "заказ"},
                "Подарки", new String[]{"подарок", "gift"}
        );

        Category best = null;
        double bestScore = 0;
        for (Category c : categories) {
            String[] keys = keywords.get(c.getName());
            if (keys == null) {
                continue;
            }
            for (String k : keys) {
                if (n.contains(k)) {
                    double score = 0.8;
                    if (score > bestScore) {
                        bestScore = score;
                        best = c;
                    }
                }
            }
        }
        if (best == null) {
            return null;
        }
        return new SuggestCategoryResponse(best.getId(), best.getName(), bestScore);
    }

    private AnalyzeResponse parseAnalyze(String json) {
        try {
            JsonNode node = objectMapper.readTree(stripFence(json));
            return new AnalyzeResponse(
                    text(node, "headline"),
                    text(node, "summary"),
                    stringList(node, "highlights"),
                    stringList(node, "risks"),
                    stringList(node, "tips"),
                    stringList(node, "topCategories")
            );
        } catch (Exception e) {
            throw ApiException.serviceUnavailable("Не удалось разобрать ответ анализа");
        }
    }

    private AskResponse parseAsk(String json) {
        try {
            JsonNode node = objectMapper.readTree(stripFence(json));
            return new AskResponse(text(node, "answer"), stringList(node, "bullets"));
        } catch (Exception e) {
            throw ApiException.serviceUnavailable("Не удалось разобрать ответ ассистента");
        }
    }

    private SuggestCategoryResponse parseSuggest(String json, List<Category> allowed) {
        try {
            JsonNode node = objectMapper.readTree(stripFence(json));
            String idRaw = node.path("categoryId").asText(null);
            double confidence = node.path("confidence").asDouble(0);
            if (idRaw == null || idRaw.isBlank()) {
                return new SuggestCategoryResponse(null, null, 0);
            }
            UUID id = UUID.fromString(idRaw);
            Category match = allowed.stream().filter(c -> c.getId().equals(id)).findFirst().orElse(null);
            if (match == null) {
                String name = node.path("categoryName").asText("");
                match = allowed.stream()
                        .filter(c -> c.getName().equalsIgnoreCase(name))
                        .findFirst()
                        .orElse(null);
            }
            if (match == null) {
                return new SuggestCategoryResponse(null, null, 0);
            }
            confidence = Math.max(0, Math.min(1, confidence));
            return new SuggestCategoryResponse(match.getId(), match.getName(), confidence);
        } catch (Exception e) {
            return new SuggestCategoryResponse(null, null, 0);
        }
    }

    private Period resolveAskPeriod(Instant from, Instant to) {
        if (from != null && to != null) {
            if (from.isAfter(to)) {
                throw ApiException.badRequest("from не может быть позже to");
            }
            return new Period(from, to);
        }
        LocalDate now = LocalDate.now(ZoneOffset.UTC);
        Instant start = now.with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = now.with(TemporalAdjusters.lastDayOfMonth()).atTime(23, 59, 59).toInstant(ZoneOffset.UTC);
        return new Period(start, end);
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() ? "" : v.asText();
    }

    private static List<String> stringList(JsonNode node, String field) {
        List<String> out = new ArrayList<>();
        JsonNode arr = node.path(field);
        if (arr.isArray()) {
            for (JsonNode item : arr) {
                String s = item.asText(null);
                if (s != null && !s.isBlank()) {
                    out.add(s);
                }
            }
        }
        return out;
    }

    private static String stripFence(String raw) {
        String s = raw.trim();
        if (s.startsWith("```")) {
            int firstNl = s.indexOf('\n');
            if (firstNl > 0) {
                s = s.substring(firstNl + 1);
            }
            if (s.endsWith("```")) {
                s = s.substring(0, s.length() - 3);
            }
        }
        return s.trim();
    }

    private record Period(Instant from, Instant to) {
    }
}
