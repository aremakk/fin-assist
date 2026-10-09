package com.budgetapp.insight.service;

import com.budgetapp.category.entity.Category;
import com.budgetapp.category.repository.CategoryRepository;
import com.budgetapp.common.MoneyType;
import com.budgetapp.common.exception.ApiException;
import com.budgetapp.config.GeminiProperties;
import com.budgetapp.insight.dto.AssistConfirmRequest;
import com.budgetapp.insight.dto.AssistConfirmResponse;
import com.budgetapp.insight.dto.AssistRequest;
import com.budgetapp.insight.dto.AssistResponse;
import com.budgetapp.insight.dto.AssistResponse.AssistAction;
import com.budgetapp.insight.dto.AssistResponse.TransactionDraft;
import com.budgetapp.insight.gemini.GeminiClient;
import com.budgetapp.transaction.dto.TransactionRequest;
import com.budgetapp.transaction.dto.TransactionResponse;
import com.budgetapp.transaction.service.TransactionService;
import com.budgetapp.wallet.entity.Wallet;
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
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class AssistService {

    private static final Set<String> ALLOWED_ROUTES = Set.of(
            "Home", "Transactions", "Stats", "Insights", "Profile",
            "TransactionForm", "Wallets", "Categories"
    );

    private static final String ASSIST_SYSTEM = """
            Ты Валли — финансовый помощник FinAssist (KZT, русский).
            Отвечай ТОЛЬКО валидным JSON:
            {
              "reply": "короткий ответ пользователю",
              "hints": ["короткая подсказка"],
              "actions": [
                {
                  "type": "CREATE_TRANSACTION|NAVIGATE|TIP",
                  "needsConfirm": true,
                  "draft": {
                    "amount": 1000,
                    "type": "EXPENSE|INCOME",
                    "note": "текст",
                    "categoryId": "uuid из списка или null",
                    "categoryName": "имя",
                    "walletId": "uuid или null",
                    "walletName": "имя"
                  },
                  "route": "Home|Transactions|Stats|Insights|Profile|TransactionForm|Wallets|Categories",
                  "params": {},
                  "text": "текст для TIP"
                }
              ]
            }
            Правила:
            - Только финансы пользователя. Оффтоп — вежливо откажи в reply, actions=[].
            - CREATE_TRANSACTION если пользователь называет сумму расхода/дохода
              (в т.ч. голосом: «запиши 2000 на такси», «2000 на еду», «потратил 1500 на кофе»).
              Не требуй обязательно слово «запиши», если есть сумма и на что.
            - NAVIGATE если просит открыть экран.
            - TIP для совета без действия / без суммы.
            - categoryId/walletId бери только из переданных списков (или null + categoryName).
            - needsConfirm всегда true для CREATE_TRANSACTION.
            - reply коротко, по-русски, от лица Валли.
            """;

    private final GeminiClient geminiClient;
    private final GeminiProperties geminiProperties;
    private final InsightContextBuilder contextBuilder;
    private final CategoryRepository categoryRepository;
    private final WalletRepository walletRepository;
    private final TransactionService transactionService;
    private final ObjectMapper objectMapper;

    public AssistService(
            GeminiClient geminiClient,
            GeminiProperties geminiProperties,
            InsightContextBuilder contextBuilder,
            CategoryRepository categoryRepository,
            WalletRepository walletRepository,
            TransactionService transactionService,
            ObjectMapper objectMapper
    ) {
        this.geminiClient = geminiClient;
        this.geminiProperties = geminiProperties;
        this.contextBuilder = contextBuilder;
        this.categoryRepository = categoryRepository;
        this.walletRepository = walletRepository;
        this.transactionService = transactionService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public AssistResponse assist(UUID userId, AssistRequest request) {
        String screen = request.screen() == null || request.screen().isBlank() ? "Home" : request.screen().trim();
        String message = request.message() == null ? "" : request.message().trim();

        if (!geminiProperties.isConfigured()) {
            return ruleAssist(userId, screen, message);
        }

        LocalDate now = LocalDate.now(ZoneOffset.UTC);
        Instant from = now.with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = now.with(TemporalAdjusters.lastDayOfMonth()).atTime(23, 59, 59).toInstant(ZoneOffset.UTC);
        String context = contextBuilder.buildFinanceContext(userId, from, to, null);

        String prompt = """
                Экран: %s
                Сообщение пользователя: %s
                (если сообщение пустое — дай 1-2 коротких hints по текущему экрану и финансам, без CREATE)

                ДАННЫЕ:
                %s
                """.formatted(screen, message.isEmpty() ? "(нет — только контекст экрана)" : message, context);

        try {
            String json = geminiClient.generateJson(ASSIST_SYSTEM, prompt);
            return sanitize(userId, parseAssist(json), screen, message);
        } catch (ApiException e) {
            return ruleAssist(userId, screen, message);
        }
    }

    @Transactional
    public AssistConfirmResponse confirm(UUID userId, AssistConfirmRequest request) {
        if (!"CREATE_TRANSACTION".equalsIgnoreCase(request.type())) {
            throw ApiException.badRequest("Поддерживается только CREATE_TRANSACTION");
        }
        AssistConfirmRequest.TransactionDraftPayload draft = request.draft();
        MoneyType type;
        try {
            type = MoneyType.valueOf(draft.type().trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw ApiException.badRequest("Некорректный тип операции");
        }

        List<Wallet> wallets = walletRepository.findAllByUserIdOrderByCreatedAtAsc(userId);
        if (wallets.isEmpty()) {
            throw ApiException.badRequest("Сначала создайте кошелёк");
        }
        UUID walletId = draft.walletId() != null ? draft.walletId() : wallets.getFirst().getId();
        if (wallets.stream().noneMatch(w -> w.getId().equals(walletId))) {
            throw ApiException.badRequest("Кошелёк не найден");
        }

        List<Category> categories = categoryRepository.findAllByUserIdAndTypeOrderByNameAsc(userId, type);
        if (categories.isEmpty()) {
            throw ApiException.badRequest("Нет категорий для этого типа");
        }
        UUID categoryId = draft.categoryId();
        Category category = categories.stream()
                .filter(c -> c.getId().equals(categoryId))
                .findFirst()
                .orElseGet(() -> matchCategoryByNote(categories, draft.note()));

        TransactionRequest txReq = new TransactionRequest(
                walletId,
                category.getId(),
                type,
                draft.amount(),
                draft.note(),
                Instant.now()
        );
        TransactionResponse created = transactionService.create(userId, txReq);
        String reply = "Записал: %s %s ₸ · %s".formatted(
                type == MoneyType.EXPENSE ? "расход" : "доход",
                draft.amount().stripTrailingZeros().toPlainString(),
                category.getName()
        );
        return new AssistConfirmResponse(reply, created);
    }

    private AssistResponse ruleAssist(UUID userId, String screen, String message) {
        List<String> hints = new ArrayList<>();
        List<AssistAction> actions = new ArrayList<>();
        String reply;

        String lower = message.toLowerCase(Locale.ROOT);
        if (!message.isBlank() && (lower.contains("открой") || lower.contains("покажи") || lower.contains("статистик")
                || lower.contains("операц") || lower.contains("кошел"))) {
            String route = "Home";
            if (lower.contains("статистик")) route = "Stats";
            else if (lower.contains("операц") || lower.contains("транзак")) route = "Transactions";
            else if (lower.contains("кошел")) route = "Wallets";
            else if (lower.contains("категор")) route = "Categories";
            else if (lower.contains("ии") || lower.contains("анализ")) route = "Insights";
            else if (lower.contains("добав") || lower.contains("запис")) route = "TransactionForm";
            actions.add(new AssistAction("NAVIGATE", false, null, route, Map.of(), null));
            reply = "Открываю «" + route + "».";
        } else if (!message.isBlank() && looksLikeMoneyPhrase(lower)) {
            TransactionDraft draft = parseDraftFromText(userId, message);
            if (draft != null) {
                actions.add(new AssistAction("CREATE_TRANSACTION", true, draft, null, null, null));
                reply = "Записать " + draft.amount().stripTrailingZeros().toPlainString()
                        + " ₸ · " + (draft.categoryName() == null ? "категория" : draft.categoryName()) + "?";
            } else {
                reply = "Уточните сумму и на что, например: «2000 на такси».";
            }
        } else {
            reply = switch (screen) {
                case "Stats" -> "Могу объяснить, куда ушли деньги за месяц.";
                case "Transactions" -> "Скажите «Валли, запиши 1500 на еду» — предложу операцию.";
                case "TransactionForm" -> "Напишите заметку — подскажу категорию.";
                default -> "Скажите «Валли» — я на связи и могу записать расход.";
            };
            hints.add(reply);
        }
        return new AssistResponse(reply, hints, actions);
    }

    private TransactionDraft parseDraftFromText(UUID userId, String message) {
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(\\d+[\\d\\s]*\\.?\\d*)")
                .matcher(message.replace(',', '.'));
        if (!m.find()) return null;
        BigDecimal amount;
        try {
            amount = new BigDecimal(m.group(1).replaceAll("\\s+", ""));
        } catch (Exception e) {
            return null;
        }
        if (amount.compareTo(BigDecimal.valueOf(0.01)) < 0) return null;

        MoneyType type = message.toLowerCase(Locale.ROOT).contains("доход")
                || message.toLowerCase(Locale.ROOT).contains("зарплат")
                ? MoneyType.INCOME : MoneyType.EXPENSE;

        List<Wallet> wallets = walletRepository.findAllByUserIdOrderByCreatedAtAsc(userId);
        if (wallets.isEmpty()) return null;
        Wallet wallet = wallets.getFirst();

        List<Category> categories = categoryRepository.findAllByUserIdAndTypeOrderByNameAsc(userId, type);
        if (categories.isEmpty()) return null;
        Category category = matchCategoryByNote(categories, message);

        String note = message.replaceAll("(?i)запиши|добавь|расход|доход|тенге|₸|на", " ")
                .replaceAll("\\d+[\\d\\s]*\\.?\\d*", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (note.length() > 120) note = note.substring(0, 120);

        return new TransactionDraft(
                amount,
                type.name(),
                note.isBlank() ? null : note,
                category.getId(),
                category.getName(),
                wallet.getId(),
                wallet.getName()
        );
    }

    private Category matchCategoryByNote(List<Category> categories, String note) {
        if (note == null || note.isBlank()) {
            return categories.getFirst();
        }
        String n = note.toLowerCase(Locale.ROOT);
        Map<String, String[]> keywords = Map.of(
                "Еда", new String[]{"еда", "магазин", "magnum", "продукты", "кафе", "кофе"},
                "Транспорт", new String[]{"такси", "яндекс", "uber", "бензин", "транспорт", "метро"},
                "Жильё", new String[]{"аренда", "квартира", "коммунал", "жильё"},
                "Развлечения", new String[]{"кино", "игра", "подписк", "развлеч"},
                "Здоровье", new String[]{"аптека", "врач", "здоров"},
                "Покупки", new String[]{"wb", "ozon", "покупк", "одежд"},
                "Зарплата", new String[]{"зарплат", "оклад"},
                "Подработка", new String[]{"фриланс", "подработ"},
                "Подарки", new String[]{"подарок"}
        );
        for (Category c : categories) {
            String[] keys = keywords.get(c.getName());
            if (keys == null) continue;
            for (String k : keys) {
                if (n.contains(k)) return c;
            }
        }
        return categories.stream()
                .filter(c -> "Другое".equals(c.getName()))
                .findFirst()
                .orElse(categories.getFirst());
    }

    private AssistResponse parseAssist(String json) {
        try {
            JsonNode root = objectMapper.readTree(stripFence(json));
            String reply = root.path("reply").asText("");
            List<String> hints = new ArrayList<>();
            if (root.path("hints").isArray()) {
                for (JsonNode h : root.path("hints")) {
                    if (!h.asText("").isBlank()) hints.add(h.asText());
                }
            }
            List<AssistAction> actions = new ArrayList<>();
            if (root.path("actions").isArray()) {
                for (JsonNode a : root.path("actions")) {
                    actions.add(parseAction(a));
                }
            }
            return new AssistResponse(reply, hints, actions);
        } catch (Exception e) {
            throw ApiException.serviceUnavailable("Не удалось разобрать ответ помощника");
        }
    }

    private AssistAction parseAction(JsonNode a) {
        String type = a.path("type").asText("");
        Boolean needsConfirm = a.path("needsConfirm").asBoolean("CREATE_TRANSACTION".equals(type));
        String route = a.path("route").asText(null);
        String text = a.path("text").asText(null);
        Map<String, String> params = new HashMap<>();
        if (a.path("params").isObject()) {
            a.path("params").fields().forEachRemaining(e -> params.put(e.getKey(), e.getValue().asText("")));
        }
        TransactionDraft draft = null;
        JsonNode d = a.path("draft");
        if (d.isObject() && !d.isEmpty()) {
            BigDecimal amount = d.has("amount") && !d.get("amount").isNull()
                    ? new BigDecimal(d.get("amount").asText("0")) : null;
            UUID categoryId = parseUuid(d.path("categoryId").asText(null));
            UUID walletId = parseUuid(d.path("walletId").asText(null));
            draft = new TransactionDraft(
                    amount,
                    d.path("type").asText("EXPENSE"),
                    blankToNull(d.path("note").asText(null)),
                    categoryId,
                    blankToNull(d.path("categoryName").asText(null)),
                    walletId,
                    blankToNull(d.path("walletName").asText(null))
            );
        }
        return new AssistAction(type, needsConfirm, draft, route, params.isEmpty() ? null : params, text);
    }

    private AssistResponse sanitize(UUID userId, AssistResponse raw, String screen, String message) {
        List<Wallet> wallets = walletRepository.findAllByUserIdOrderByCreatedAtAsc(userId);
        List<Category> expenseCats = categoryRepository.findAllByUserIdAndTypeOrderByNameAsc(userId, MoneyType.EXPENSE);
        List<Category> incomeCats = categoryRepository.findAllByUserIdAndTypeOrderByNameAsc(userId, MoneyType.INCOME);

        List<AssistAction> cleaned = new ArrayList<>();
        for (AssistAction action : raw.actions() == null ? List.<AssistAction>of() : raw.actions()) {
            if (action == null || action.type() == null) continue;
            switch (action.type().toUpperCase(Locale.ROOT)) {
                case "NAVIGATE" -> {
                    if (action.route() != null && ALLOWED_ROUTES.contains(action.route())) {
                        cleaned.add(new AssistAction("NAVIGATE", false, null, action.route(), action.params(), null));
                    }
                }
                case "TIP" -> {
                    if (action.text() != null && !action.text().isBlank()) {
                        cleaned.add(new AssistAction("TIP", false, null, null, null, action.text()));
                    }
                }
                case "CREATE_TRANSACTION" -> {
                    if (message.isBlank()) break;
                    TransactionDraft draft = action.draft();
                    if (draft == null || draft.amount() == null
                            || draft.amount().compareTo(BigDecimal.valueOf(0.01)) < 0) {
                        break;
                    }
                    MoneyType type;
                    try {
                        type = MoneyType.valueOf(draft.type() == null ? "EXPENSE" : draft.type().toUpperCase(Locale.ROOT));
                    } catch (Exception e) {
                        type = MoneyType.EXPENSE;
                    }
                    List<Category> cats = type == MoneyType.INCOME ? incomeCats : expenseCats;
                    if (wallets.isEmpty() || cats.isEmpty()) break;
                    Wallet wallet = wallets.stream()
                            .filter(w -> w.getId().equals(draft.walletId()))
                            .findFirst()
                            .orElse(wallets.getFirst());
                    Category category = cats.stream()
                            .filter(c -> c.getId().equals(draft.categoryId()))
                            .findFirst()
                            .orElseGet(() -> {
                                if (draft.categoryName() != null) {
                                    return cats.stream()
                                            .filter(c -> c.getName().equalsIgnoreCase(draft.categoryName()))
                                            .findFirst()
                                            .orElse(matchCategoryByNote(cats, draft.note()));
                                }
                                return matchCategoryByNote(cats, draft.note());
                            });
                    cleaned.add(new AssistAction(
                            "CREATE_TRANSACTION",
                            true,
                            new TransactionDraft(
                                    draft.amount(),
                                    type.name(),
                                    draft.note(),
                                    category.getId(),
                                    category.getName(),
                                    wallet.getId(),
                                    wallet.getName()
                            ),
                            null,
                            null,
                            null
                    ));
                }
                default -> {
                }
            }
        }

        List<String> hints = raw.hints() == null ? List.of() : raw.hints().stream()
                .filter(h -> h != null && !h.isBlank())
                .limit(3)
                .toList();
        if (hints.isEmpty() && message.isBlank()) {
            hints = List.of(raw.reply() == null || raw.reply().isBlank()
                    ? "Могу записать расход или открыть статистику."
                    : raw.reply());
        }
        // If model forgot CREATE but user clearly named an amount — parse locally
        if (cleaned.stream().noneMatch(a -> "CREATE_TRANSACTION".equals(a.type()))
                && looksLikeMoneyPhrase(message.toLowerCase(Locale.ROOT))) {
            TransactionDraft fallback = parseDraftFromText(userId, message);
            if (fallback != null) {
                cleaned = new ArrayList<>(cleaned);
                cleaned.add(new AssistAction("CREATE_TRANSACTION", true, fallback, null, null, null));
            }
        }

        String reply = raw.reply() == null || raw.reply().isBlank()
                ? (cleaned.isEmpty() ? "Чем помочь по финансам?" : "Готово.")
                : raw.reply();
        return new AssistResponse(reply, hints, cleaned);
    }

    private static boolean looksLikeMoneyPhrase(String lower) {
        if (lower == null || lower.isBlank()) return false;
        boolean hasDigit = lower.chars().anyMatch(Character::isDigit);
        if (!hasDigit) return false;
        return lower.contains("запиш") || lower.contains("добав") || lower.contains("расход")
                || lower.contains("доход") || lower.contains("потрат") || lower.contains("купил")
                || lower.contains("оплат") || lower.contains("тенге") || lower.contains("₸")
                || lower.contains(" на ") || lower.matches(".*\\d{2,}.*");
    }

    private static UUID parseUuid(String raw) {
        if (raw == null || raw.isBlank() || "null".equalsIgnoreCase(raw)) return null;
        try {
            return UUID.fromString(raw.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() || "null".equalsIgnoreCase(s) ? null : s;
    }

    private static String stripFence(String raw) {
        String s = raw.trim();
        if (s.startsWith("```")) {
            int firstNl = s.indexOf('\n');
            if (firstNl > 0) s = s.substring(firstNl + 1);
            if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
        }
        return s.trim();
    }
}
