# FinAssist

Личный бюджет: доходы, расходы, баланс и простая статистика.

Pet-project / портфолио. Один пользователь, локальный запуск. GitHub пока не обязателен.

## Структура

```
backend/            Spring Boot 3 API
mobile/             React Native (Expo)
docker-compose.yml  PostgreSQL
```

## Требования

- Java 21
- Maven 3.9+
- Docker
- Node.js 20+
- Expo Go (для телефона) или iOS Simulator / Android Emulator

## 1. PostgreSQL

```bash
docker compose up -d
```

Параметры по умолчанию:

- host: `localhost:5432`
- db: `budget_app`
- user/password: `budget` / `budget`

## 2. Backend

```bash
cd backend
# рекомендуемый JAVA_HOME (Homebrew):
# export JAVA_HOME=/opt/homebrew/opt/openjdk@21
# export PATH="$JAVA_HOME/bin:$PATH"
mvn spring-boot:run
```

- API: `http://localhost:8080/api/v1`
- Swagger: `http://localhost:8080/swagger-ui.html`

Опционально секрет JWT:

```bash
export APP_JWT_SECRET='your-long-random-secret-at-least-32-chars'
```

Пример `.env` — `backend/.env.example` (не коммитить реальные секреты).

## 3. Mobile

```bash
cd mobile
npm install
npx expo start
```

API URL задаётся в `mobile/src/utils/config.ts`:

- iOS Simulator: `http://localhost:8080/api/v1`
- Android Emulator: `http://10.0.2.2:8080/api/v1`
- Физическое устройство: замените host на IP вашего Mac в локальной сети

## MVP возможности

- Регистрация / логин / refresh JWT
- Кошелёк «Основной» и дефолтные категории при регистрации
- CRUD операций, фильтры, пагинация
- Баланс кошелька
- Summary, разбивка по категориям, динамика по дням
- Экраны: главная, операции, статистика, профиль, категории, кошельки

## API кратко

Base: `/api/v1` + Bearer JWT

- Auth: `POST /auth/register|login|refresh`, `GET /auth/me`
- Users: `PUT /users/me`, `PUT /users/me/password`
- Wallets / Categories / Transactions / Stats — см. Swagger
# fin-assist
