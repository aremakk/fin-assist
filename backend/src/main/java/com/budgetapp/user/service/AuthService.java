package com.budgetapp.user.service;

import com.budgetapp.common.exception.ApiException;
import com.budgetapp.security.JwtService;
import com.budgetapp.user.dto.AuthResponse;
import com.budgetapp.user.dto.LoginRequest;
import com.budgetapp.user.dto.RefreshRequest;
import com.budgetapp.user.dto.RegisterRequest;
import com.budgetapp.user.dto.UserResponse;
import com.budgetapp.user.entity.RefreshToken;
import com.budgetapp.user.entity.User;
import com.budgetapp.user.repository.RefreshTokenRepository;
import com.budgetapp.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final DefaultDataSeeder defaultDataSeeder;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            DefaultDataSeeder defaultDataSeeder
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.defaultDataSeeder = defaultDataSeeder;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Email уже зарегистрирован");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName().trim());
        userRepository.save(user);

        defaultDataSeeder.seedFor(user);
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.unauthorized("Неверный email или пароль"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Неверный email или пароль");
        }

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        try {
            Claims claims = jwtService.parseClaims(request.refreshToken());
            if (!JwtService.TYPE_REFRESH.equals(jwtService.getTokenType(claims))) {
                throw ApiException.unauthorized("Недействительный refresh token");
            }

            String hash = hashToken(request.refreshToken());
            RefreshToken stored = refreshTokenRepository.findByTokenHashAndRevokedFalse(hash)
                    .orElseThrow(() -> ApiException.unauthorized("Refresh token отозван или не найден"));

            if (stored.getExpiresAt().isBefore(Instant.now())) {
                stored.setRevoked(true);
                throw ApiException.unauthorized("Срок действия refresh token истёк");
            }

            User user = stored.getUser();
            stored.setRevoked(true);
            return issueTokens(user);
        } catch (JwtException | IllegalArgumentException ex) {
            throw ApiException.unauthorized("Недействительный refresh token");
        }
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail());

        RefreshToken entity = new RefreshToken();
        entity.setUser(user);
        entity.setTokenHash(hashToken(refreshToken));
        entity.setExpiresAt(Instant.now().plusMillis(jwtService.getRefreshTokenExpirationMs()));
        entity.setRevoked(false);
        refreshTokenRepository.save(entity);

        return AuthResponse.of(accessToken, refreshToken, UserResponse.from(user));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
