package com.budgetapp.category.repository;

import com.budgetapp.common.MoneyType;
import com.budgetapp.category.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findAllByUserIdOrderByTypeAscNameAsc(UUID userId);

    List<Category> findAllByUserIdAndTypeOrderByNameAsc(UUID userId, MoneyType type);

    Optional<Category> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByIdAndUserId(UUID id, UUID userId);
}
