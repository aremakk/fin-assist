package com.budgetapp.user.service;

import com.budgetapp.common.exception.ApiException;
import com.budgetapp.user.dto.ChangePasswordRequest;
import com.budgetapp.user.dto.UpdateProfileRequest;
import com.budgetapp.user.dto.UserResponse;
import com.budgetapp.user.entity.User;
import com.budgetapp.user.repository.RefreshTokenRepository;
import com.budgetapp.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public UserResponse getProfile(UUID userId) {
        return UserResponse.from(getUser(userId));
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = getUser(userId);
        user.setDisplayName(request.displayName().trim());
        return UserResponse.from(user);
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = getUser(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Текущий пароль неверен");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw ApiException.badRequest("Новый пароль должен отличаться от текущего");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Пользователь не найден"));
    }
}
