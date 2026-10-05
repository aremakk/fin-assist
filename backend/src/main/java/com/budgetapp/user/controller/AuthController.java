package com.budgetapp.user.controller;

import com.budgetapp.security.SecurityUtils;
import com.budgetapp.user.dto.AuthResponse;
import com.budgetapp.user.dto.LoginRequest;
import com.budgetapp.user.dto.RefreshRequest;
import com.budgetapp.user.dto.RegisterRequest;
import com.budgetapp.user.dto.UserResponse;
import com.budgetapp.user.service.AuthService;
import com.budgetapp.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @GetMapping("/me")
    public UserResponse me() {
        return userService.getProfile(SecurityUtils.currentUserId());
    }
}
