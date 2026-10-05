package com.budgetapp.transaction.service;

import com.budgetapp.category.entity.Category;
import com.budgetapp.category.service.CategoryService;
import com.budgetapp.common.MoneyType;
import com.budgetapp.common.dto.PageResponse;
import com.budgetapp.common.exception.ApiException;
import com.budgetapp.transaction.dto.TransactionRequest;
import com.budgetapp.transaction.dto.TransactionResponse;
import com.budgetapp.transaction.entity.Transaction;
import com.budgetapp.transaction.repository.TransactionRepository;
import com.budgetapp.transaction.repository.TransactionSpecs;
import com.budgetapp.wallet.service.WalletService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletService walletService;
    private final CategoryService categoryService;

    public TransactionService(
            TransactionRepository transactionRepository,
            WalletService walletService,
            CategoryService categoryService
    ) {
        this.transactionRepository = transactionRepository;
        this.walletService = walletService;
        this.categoryService = categoryService;
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> list(
            UUID userId,
            Instant from,
            Instant to,
            MoneyType type,
            UUID categoryId,
            UUID walletId,
            String q,
            int page,
            int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "occurredAt"));
        String query = (q == null || q.isBlank()) ? null : q.trim();
        Page<TransactionResponse> result = transactionRepository
                .findAll(TransactionSpecs.search(userId, from, to, type, categoryId, walletId, query), pageable)
                .map(TransactionResponse::from);
        return PageResponse.from(result);
    }

    @Transactional(readOnly = true)
    public TransactionResponse get(UUID userId, UUID id) {
        return TransactionResponse.from(getOwned(userId, id));
    }

    @Transactional
    public TransactionResponse create(UUID userId, TransactionRequest request) {
        validateRelations(userId, request);
        Transaction transaction = new Transaction();
        apply(transaction, userId, request);
        return TransactionResponse.from(transactionRepository.save(transaction));
    }

    @Transactional
    public TransactionResponse update(UUID userId, UUID id, TransactionRequest request) {
        Transaction transaction = getOwned(userId, id);
        validateRelations(userId, request);
        apply(transaction, userId, request);
        return TransactionResponse.from(transaction);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        Transaction transaction = getOwned(userId, id);
        transactionRepository.delete(transaction);
    }

    private void validateRelations(UUID userId, TransactionRequest request) {
        walletService.getOwned(userId, request.walletId());
        Category category = categoryService.getOwned(userId, request.categoryId());
        if (category.getType() != request.type()) {
            throw ApiException.badRequest("Тип операции должен совпадать с типом категории");
        }
    }

    private void apply(Transaction transaction, UUID userId, TransactionRequest request) {
        transaction.setUserId(userId);
        transaction.setWalletId(request.walletId());
        transaction.setCategoryId(request.categoryId());
        transaction.setType(request.type());
        transaction.setAmount(request.amount());
        transaction.setNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
        transaction.setOccurredAt(request.occurredAt());
    }

    private Transaction getOwned(UUID userId, UUID id) {
        return transactionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Операция не найдена"));
    }
}
