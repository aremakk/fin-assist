package com.budgetapp.wallet.controller;

import com.budgetapp.security.SecurityUtils;
import com.budgetapp.wallet.dto.BalanceResponse;
import com.budgetapp.wallet.dto.WalletRequest;
import com.budgetapp.wallet.dto.WalletResponse;
import com.budgetapp.wallet.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wallets")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping
    public List<WalletResponse> list() {
        return walletService.list(SecurityUtils.currentUserId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WalletResponse create(@Valid @RequestBody WalletRequest request) {
        return walletService.create(SecurityUtils.currentUserId(), request);
    }

    @PutMapping("/{id}")
    public WalletResponse update(@PathVariable UUID id, @Valid @RequestBody WalletRequest request) {
        return walletService.rename(SecurityUtils.currentUserId(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        walletService.delete(SecurityUtils.currentUserId(), id);
    }

    @GetMapping("/{id}/balance")
    public BalanceResponse balance(@PathVariable UUID id) {
        return walletService.balance(SecurityUtils.currentUserId(), id);
    }
}
