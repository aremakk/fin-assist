package com.budgetapp.insight.controller;

import com.budgetapp.insight.dto.AnalyzeRequest;
import com.budgetapp.insight.dto.AnalyzeResponse;
import com.budgetapp.insight.dto.AskRequest;
import com.budgetapp.insight.dto.AskResponse;
import com.budgetapp.insight.dto.AssistConfirmRequest;
import com.budgetapp.insight.dto.AssistConfirmResponse;
import com.budgetapp.insight.dto.AssistRequest;
import com.budgetapp.insight.dto.AssistResponse;
import com.budgetapp.insight.dto.ProactiveResponse;
import com.budgetapp.insight.dto.SuggestCategoryRequest;
import com.budgetapp.insight.dto.SuggestCategoryResponse;
import com.budgetapp.insight.service.AssistService;
import com.budgetapp.insight.service.InsightService;
import com.budgetapp.insight.service.ProactiveService;
import com.budgetapp.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/insights")
public class InsightController {

    private final InsightService insightService;
    private final AssistService assistService;
    private final ProactiveService proactiveService;

    public InsightController(
            InsightService insightService,
            AssistService assistService,
            ProactiveService proactiveService
    ) {
        this.insightService = insightService;
        this.assistService = assistService;
        this.proactiveService = proactiveService;
    }

    @PostMapping("/analyze")
    public AnalyzeResponse analyze(@Valid @RequestBody AnalyzeRequest request) {
        return insightService.analyze(
                SecurityUtils.currentUserId(),
                request.from(),
                request.to(),
                request.walletId()
        );
    }

    @PostMapping("/ask")
    public AskResponse ask(@Valid @RequestBody AskRequest request) {
        return insightService.ask(
                SecurityUtils.currentUserId(),
                request.question(),
                request.from(),
                request.to(),
                request.walletId()
        );
    }

    @PostMapping("/suggest-category")
    public SuggestCategoryResponse suggestCategory(@Valid @RequestBody SuggestCategoryRequest request) {
        return insightService.suggestCategory(
                SecurityUtils.currentUserId(),
                request.type(),
                request.amount(),
                request.note(),
                request.walletId()
        );
    }

    @PostMapping("/assist")
    public AssistResponse assist(@Valid @RequestBody AssistRequest request) {
        return assistService.assist(SecurityUtils.currentUserId(), request);
    }

    @PostMapping("/assist/confirm")
    public AssistConfirmResponse confirm(@Valid @RequestBody AssistConfirmRequest request) {
        return assistService.confirm(SecurityUtils.currentUserId(), request);
    }

    @GetMapping("/proactive")
    public ProactiveResponse proactive() {
        return proactiveService.proactive(SecurityUtils.currentUserId());
    }
}
