-- Switch default and existing wallets to Kazakhstani tenge
ALTER TABLE wallets ALTER COLUMN currency SET DEFAULT 'KZT';
UPDATE wallets SET currency = 'KZT' WHERE currency = 'RUB';
