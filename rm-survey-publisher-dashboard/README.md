# RM Survey Publisher Dashboard (Laravel + React)

Full-stack publisher workspace with:

- **`backend/`** — Laravel 12 REST API, **MySQL**, **Laravel Sanctum** (Bearer tokens), MVC + services.
- **`frontend/`** — React (Vite + TypeScript) + Tailwind + Axios + Recharts + `@dnd-kit` survey builder.

**Wallet requirement:** Every publisher user has exactly one row in the **`wallets`** table (`user_id`, `balance`, `currency`). Survey response rewards and withdrawals update this balance and are mirrored in **`publisher_transactions`**.

---

## Folder layout

```
rm-survey-publisher-dashboard/
├── README.md
├── backend/                 # Laravel API (php artisan serve)
│   ├── app/Http/Controllers/Api/
│   ├── app/Models/          # User, Wallet, Survey, SurveyQuestion, SurveyResponse, Earning, PublisherTransaction, PublisherNotification
│   ├── database/migrations/
│   ├── database/seeders/PublisherDemoSeeder.php
│   ├── routes/api.php
│   └── config/publisher.php # EARNING_PER_RESPONSE_USD
└── frontend/                # Vite React SPA (npm run dev)
    └── src/
```

---

## Backend setup

```bash
cd backend
copy .env.example .env   # Windows — or cp on Unix
php artisan key:generate
```

1. Create MySQL database `rm_survey_publisher` (or adjust `.env`).
2. Configure `.env` (`DB_*`, `APP_URL`, `CORS_ALLOWED_ORIGINS`, `EARNING_PER_RESPONSE_USD`).
3. Migrate + seed:

```bash
php artisan migrate --seed
```

**Demo login (after seed):** `publisher@demo.local` / `password`

Run API:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

API base: `http://127.0.0.1:8000/api`

---

## Frontend setup

```bash
cd frontend
npm install
copy .env.example .env.local   # optional — defaults use Vite proxy
npm run dev
```

Development uses **`vite.config.ts` proxy**: browser calls `/api` → Laravel `:8000`, avoiding CORS friction.

`frontend/.env.example`:

```
VITE_API_URL=/api
```

For a deployed SPA pointing at a remote API, set `VITE_API_URL=https://your-api.example.com/api` and align **`CORS_ALLOWED_ORIGINS`** on Laravel.

---

## Core API map

| Area | Routes (prefix `/api`) |
|------|-------------------------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/profile`, `POST /auth/change-password` |
| Surveys | `GET/POST /surveys`, `GET/PUT/PATCH/DELETE /surveys/{survey}`, `GET /surveys/public/{id}`, `POST /surveys/{id}/responses` |
| Dashboard | `/dashboard/stats`, `performance`, `responses-by-survey`, `completion-split`, `recent-activity` |
| Wallet / money | `GET /earnings/summary`, `/earnings/chart`, `/earnings/list`, `GET /transactions`, `POST /transactions/withdraw` |
| Other | `/notifications`, `/analytics/overview`, `/audience/users`, `POST /ai/suggestions` |

Send header: `Authorization: Bearer {token}` for protected routes.

---

## Database highlights

| Table | Role |
|-------|------|
| `users` | Publishers (`role=publisher`), profile JSON (`payment_details`, `notification_prefs`) |
| **`wallets`** | **One wallet per user** — authoritative USD balance |
| `surveys` | Owned by `user_id`, status, aggregates |
| `survey_questions` | Normalized questions + JSON `logic` |
| `survey_responses` | Answers JSON; `user_id` = publisher (owner) |
| `earnings` | Ledger rows per credited response |
| **`publisher_transactions`** | Credits / withdrawals tied to `wallet_id` |

---

## Production notes

- Run `php artisan config:cache` & `route:cache`.
- Serve SPA built assets (`npm run build`) behind nginx/Apache or CDN.
- Use HTTPS and strict `CORS_ALLOWED_ORIGINS`.
- Keep Sanctum tokens short-lived in production if needed (`config/sanctum.php`).
