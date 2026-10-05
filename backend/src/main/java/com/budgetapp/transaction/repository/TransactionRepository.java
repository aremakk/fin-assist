package com.budgetapp.transaction.repository;

import com.budgetapp.common.MoneyType;
import com.budgetapp.transaction.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID>, JpaSpecificationExecutor<Transaction> {

    Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByWalletId(UUID walletId);

    boolean existsByCategoryId(UUID categoryId);

    @Query("""
            SELECT COALESCE(SUM(t.amount), 0)
            FROM Transaction t
            WHERE t.walletId = :walletId AND t.type = com.budgetapp.common.MoneyType.INCOME
            """)
    BigDecimal sumIncomeByWalletId(@Param("walletId") UUID walletId);

    @Query("""
            SELECT COALESCE(SUM(t.amount), 0)
            FROM Transaction t
            WHERE t.walletId = :walletId AND t.type = com.budgetapp.common.MoneyType.EXPENSE
            """)
    BigDecimal sumExpenseByWalletId(@Param("walletId") UUID walletId);

    @Query("""
            SELECT COALESCE(SUM(t.amount), 0)
            FROM Transaction t
            WHERE t.userId = :userId
              AND t.type = :type
              AND (:walletId IS NULL OR t.walletId = :walletId)
              AND t.occurredAt >= :from
              AND t.occurredAt <= :to
            """)
    BigDecimal sumByTypeInPeriod(
            @Param("userId") UUID userId,
            @Param("type") MoneyType type,
            @Param("walletId") UUID walletId,
            @Param("from") Instant from,
            @Param("to") Instant to
    );

    @Query("""
            SELECT t.categoryId, SUM(t.amount)
            FROM Transaction t
            WHERE t.userId = :userId
              AND t.type = :type
              AND (:walletId IS NULL OR t.walletId = :walletId)
              AND t.occurredAt >= :from
              AND t.occurredAt <= :to
            GROUP BY t.categoryId
            """)
    List<Object[]> sumGroupedByCategory(
            @Param("userId") UUID userId,
            @Param("type") MoneyType type,
            @Param("walletId") UUID walletId,
            @Param("from") Instant from,
            @Param("to") Instant to
    );

    @Query(value = """
            SELECT CAST(t.occurred_at AS date) AS day,
                   COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) AS incomes,
                   COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) AS expenses
            FROM transactions t
            WHERE t.user_id = CAST(:userId AS uuid)
              AND (CAST(:walletId AS uuid) IS NULL OR t.wallet_id = CAST(:walletId AS uuid))
              AND t.occurred_at >= CAST(:from AS timestamptz)
              AND t.occurred_at <= CAST(:to AS timestamptz)
            GROUP BY CAST(t.occurred_at AS date)
            ORDER BY day
            """, nativeQuery = true)
    List<Object[]> sumGroupedByDay(
            @Param("userId") UUID userId,
            @Param("walletId") UUID walletId,
            @Param("from") Instant from,
            @Param("to") Instant to
    );
}
