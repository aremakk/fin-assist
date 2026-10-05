package com.budgetapp.user.service;

import com.budgetapp.category.entity.Category;
import com.budgetapp.category.repository.CategoryRepository;
import com.budgetapp.common.MoneyType;
import com.budgetapp.user.entity.User;
import com.budgetapp.wallet.entity.Wallet;
import com.budgetapp.wallet.repository.WalletRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
public class DefaultDataSeeder {

    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;

    public DefaultDataSeeder(WalletRepository walletRepository, CategoryRepository categoryRepository) {
        this.walletRepository = walletRepository;
        this.categoryRepository = categoryRepository;
    }

    public void seedFor(User user) {
        Wallet wallet = new Wallet();
        wallet.setUserId(user.getId());
        wallet.setName("Основной");
        wallet.setCurrency("KZT");
        wallet.setInitialBalance(BigDecimal.ZERO);
        walletRepository.save(wallet);

        List<Category> categories = new ArrayList<>();
        categories.add(category(user, "Еда", MoneyType.EXPENSE, "food", "#EF4444"));
        categories.add(category(user, "Транспорт", MoneyType.EXPENSE, "transport", "#F97316"));
        categories.add(category(user, "Жильё", MoneyType.EXPENSE, "home", "#A855F7"));
        categories.add(category(user, "Развлечения", MoneyType.EXPENSE, "entertainment", "#EC4899"));
        categories.add(category(user, "Здоровье", MoneyType.EXPENSE, "health", "#14B8A6"));
        categories.add(category(user, "Покупки", MoneyType.EXPENSE, "shopping", "#3B82F6"));
        categories.add(category(user, "Другое", MoneyType.EXPENSE, "other", "#6B7280"));
        categories.add(category(user, "Зарплата", MoneyType.INCOME, "salary", "#22C55E"));
        categories.add(category(user, "Подработка", MoneyType.INCOME, "freelance", "#84CC16"));
        categories.add(category(user, "Подарки", MoneyType.INCOME, "gift", "#F59E0B"));
        categories.add(category(user, "Другое", MoneyType.INCOME, "other", "#6B7280"));
        categoryRepository.saveAll(categories);
    }

    private Category category(User user, String name, MoneyType type, String icon, String color) {
        Category category = new Category();
        category.setUserId(user.getId());
        category.setName(name);
        category.setType(type);
        category.setIcon(icon);
        category.setColor(color);
        category.setSystem(true);
        return category;
    }
}
