CREATE TABLE users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(120) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE wallets (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'RUB',
    initial_balance NUMERIC(19, 2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON wallets (user_id);

CREATE TABLE categories (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    type            VARCHAR(20) NOT NULL,
    icon            VARCHAR(64),
    color           VARCHAR(32),
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_categories_type CHECK (type IN ('INCOME', 'EXPENSE'))
);

CREATE INDEX idx_categories_user_id ON categories (user_id);
CREATE INDEX idx_categories_user_type ON categories (user_id, type);

CREATE TABLE transactions (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    wallet_id       UUID NOT NULL REFERENCES wallets (id),
    category_id     UUID NOT NULL REFERENCES categories (id),
    type            VARCHAR(20) NOT NULL,
    amount          NUMERIC(19, 2) NOT NULL,
    note            VARCHAR(500),
    occurred_at     TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_transactions_type CHECK (type IN ('INCOME', 'EXPENSE')),
    CONSTRAINT chk_transactions_amount CHECK (amount > 0)
);

CREATE INDEX idx_transactions_user_occurred ON transactions (user_id, occurred_at);
CREATE INDEX idx_transactions_category_id ON transactions (category_id);
CREATE INDEX idx_transactions_wallet_id ON transactions (wallet_id);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash      VARCHAR(128) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
