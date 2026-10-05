package com.budgetapp.wallet.service;

import com.budgetapp.common.exception.ApiException;
import com.budgetapp.transaction.repository.TransactionRepository;
import com.budgetapp.wallet.dto.BalanceResponse;
import com.budgetapp.wallet.dto.WalletRequest;
import com.budgetapp.wallet.dto.WalletResponse;
import com.budgetapp.wallet.entity.Wallet;
import com.budgetapp.wallet.repository.WalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    public WalletService(WalletRepository walletRepository, TransactionRepository transactionRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public List<WalletResponse> list(UUID userId) {
        return walletRepository.findAllByUserIdOrderByCreatedAtAsc(userId).stream()
                .map(WalletResponse::from)
                .toList();
    }

    @Transactional
    public WalletResponse create(UUID userId, WalletRequest request) {
        Wallet wallet = new Wallet();
        wallet.setUserId(userId);
        wallet.setName(request.name().trim());
        wallet.setCurrency("KZT");
        wallet.setInitialBalance(request.initialBalance() != null ? request.initialBalance() : BigDecimal.ZERO);
        return WalletResponse.from(walletRepository.save(wallet));
    }

    @Transactional
    public WalletResponse rename(UUID userId, UUID walletId, WalletRequest request) {
        Wallet wallet = getOwned(userId, walletId);
        wallet.setName(request.name().trim());
        if (request.initialBalance() != null) {
            wallet.setInitialBalance(request.initialBalance());
        }
        return WalletResponse.from(wallet);
    }

    @Transactional
    public void delete(UUID userId, UUID walletId) {
        Wallet wallet = getOwned(userId, walletId);
        if (transactionRepository.existsByWalletId(walletId)) {
            throw ApiException.conflict("Нельзя удалить кошелёк с транзакциями");
        }
        walletRepository.delete(wallet);
    }

    @Transactional(readOnly = true)
    public BalanceResponse balance(UUID userId, UUID walletId) {
        Wallet wallet = getOwned(userId, walletId);
        BigDecimal income = transactionRepository.sumIncomeByWalletId(walletId);
        BigDecimal expense = transactionRepository.sumExpenseByWalletId(walletId);
        BigDecimal balance = wallet.getInitialBalance().add(income).subtract(expense);
        return new BalanceResponse(walletId, balance, wallet.getCurrency());
    }

    public Wallet getOwned(UUID userId, UUID walletId) {
        return walletRepository.findByIdAndUserId(walletId, userId)
                .orElseThrow(() -> ApiException.notFound("Кошелёк не найден"));
    }
}
