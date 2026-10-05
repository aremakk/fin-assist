package com.budgetapp.category.service;

import com.budgetapp.category.dto.CategoryRequest;
import com.budgetapp.category.dto.CategoryResponse;
import com.budgetapp.category.entity.Category;
import com.budgetapp.category.repository.CategoryRepository;
import com.budgetapp.common.MoneyType;
import com.budgetapp.common.exception.ApiException;
import com.budgetapp.transaction.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;

    public CategoryService(CategoryRepository categoryRepository, TransactionRepository transactionRepository) {
        this.categoryRepository = categoryRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list(UUID userId, MoneyType type) {
        List<Category> categories = type == null
                ? categoryRepository.findAllByUserIdOrderByTypeAscNameAsc(userId)
                : categoryRepository.findAllByUserIdAndTypeOrderByNameAsc(userId, type);
        return categories.stream().map(CategoryResponse::from).toList();
    }

    @Transactional
    public CategoryResponse create(UUID userId, CategoryRequest request) {
        Category category = new Category();
        category.setUserId(userId);
        category.setName(request.name().trim());
        category.setType(request.type());
        category.setIcon(request.icon());
        category.setColor(request.color());
        category.setSystem(false);
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse update(UUID userId, UUID categoryId, CategoryRequest request) {
        Category category = getOwned(userId, categoryId);
        category.setName(request.name().trim());
        category.setType(request.type());
        category.setIcon(request.icon());
        category.setColor(request.color());
        return CategoryResponse.from(category);
    }

    @Transactional
    public void delete(UUID userId, UUID categoryId) {
        Category category = getOwned(userId, categoryId);
        if (transactionRepository.existsByCategoryId(categoryId)) {
            throw ApiException.conflict("Нельзя удалить категорию с транзакциями");
        }
        categoryRepository.delete(category);
    }

    public Category getOwned(UUID userId, UUID categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> ApiException.notFound("Категория не найдена"));
    }
}
