# FABIANO Store

Премиальный интернет-магазин одежды FABIANO: Next.js + PostgreSQL + Prisma.

**Текущий статус:** PHASE 1 готова, PHASE 2 в работе. Подробно — [docs/PROGRESS.md](docs/PROGRESS.md).

## Локальный запуск (по мере готовности фаз)

```bash
cp .env.example .env          # заполнить SESSION_SECRET, CART_COOKIE_SECRET
docker compose up -d          # PostgreSQL 16, MinIO, Redis
npm install
npm run db:migrate            # init + prisma/sql/001_constraints.sql
npm run db:seed
npm run dev
```

## Тесты

```bash
npm run test:db    # ограничения целостности и складская логика на PostgreSQL
npm test           # unit / integration
npm run test:e2e   # Playwright, desktop + mobile
```

## Интеграции, которые требуют настройки

| Интеграция | Переменные | Без них |
|---|---|---|
| Payme | `PAYME_MERCHANT_ID`, `PAYME_SECRET_KEY` | метод скрыт в checkout |
| Click | `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_MERCHANT_USER_ID`, `CLICK_SECRET_KEY` | метод скрыт в checkout |
| Живая примерка (Decart Lucy V-TON) | `DECART_API_KEY` + «Jonli kiyib koʻrish» в админке | кнопка примерки не показывается |
| Email | `SMTP_*` | сброс пароля и подтверждения не отправляются |
