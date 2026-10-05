package com.budgetapp.transaction.repository;

import com.budgetapp.common.MoneyType;
import com.budgetapp.transaction.entity.Transaction;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public final class TransactionSpecs {

    private TransactionSpecs() {
    }

    public static Specification<Transaction> search(
            UUID userId,
            Instant from,
            Instant to,
            MoneyType type,
            UUID categoryId,
            UUID walletId,
            String q
    ) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));

            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), to));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("categoryId"), categoryId));
            }
            if (walletId != null) {
                predicates.add(cb.equal(root.get("walletId"), walletId));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.like(cb.lower(cb.coalesce(root.get("note"), "")), pattern));
            }

            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}
