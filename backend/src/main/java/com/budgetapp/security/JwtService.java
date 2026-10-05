package com.budgetapp.security;

import com.budgetapp.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    public static final String CLAIM_TYPE = "type";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(UUID userId, String email) {
        return buildToken(userId, email, TYPE_ACCESS, properties.accessTokenExpirationMs());
    }

    public String generateRefreshToken(UUID userId, String email) {
        return buildToken(userId, email, TYPE_REFRESH, properties.refreshTokenExpirationMs());
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID getUserId(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }

    public String getTokenType(Claims claims) {
        return claims.get(CLAIM_TYPE, String.class);
    }

    public Instant getExpiration(Claims claims) {
        return claims.getExpiration().toInstant();
    }

    public long getRefreshTokenExpirationMs() {
        return properties.refreshTokenExpirationMs();
    }

    private String buildToken(UUID userId, String email, String type, long expirationMs) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(userId.toString())
                .claim("email", email)
                .claim(CLAIM_TYPE, type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(key)
                .compact();
    }
}
