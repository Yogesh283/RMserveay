# RM Survey Publisher Dashboard

Full-stack publisher dashboard: **Next.js (React) + Tailwind** frontend, **Express + MongoDB (Mongoose)** backend, **JWT** auth, **Recharts** analytics, and a **drag-and-drop survey builder** with conditional logic.

## Folder structure

```
publisher-dashboard/
├── README.md                 ← This file
├── client/                   ← Next.js app
│   ├── .env.local.example
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/              ← App Router pages
│       ├── components/       ← Shell, survey builder, preview
│       ├── context/          ← Auth + theme
│       ├── lib/              ← API client, survey logic helpers
│       └── types/
└── server/                   ← Express API
    ├── .env.example
    ├── package.json
    └── src/
        ├── index.js
        ├── config/
        ├── middleware/
        ├── models/
        ├── routes/
        ├── services/
        └── utils/
```

## Prerequisites

- **Node.js** 18+ (20 LTS recommended)
- **MongoDB** running locally or a connection string (MongoDB Atlas is fine)

## MongoDB setup

1. Install MongoDB Community Edition, or use Docker:

   ```bash
   docker run -d -p 27017:27017 --name mongo mongo:7
   ```

2. Default connection used in `.env.example`: `mongodb://127.0.0.1:27017/rm_survey_publisher`

## Installation

### Backend

```bash
cd publisher-dashboard/server
copy .env.example .env
# Edit .env: set JWT_SECRET, MONGODB_URI if needed
npm install
```

### Frontend

```bash
cd publisher-dashboard/client
copy .env.local.example .env.local
# NEXT_PUBLIC_API_URL should match API (default http://localhost:4000)
npm install
```

## Environment files

**`server/.env`** (copy from `server/.env.example`):

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `4000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `CLIENT_ORIGIN` | Frontend origin for CORS (e.g. `http://localhost:3000`) |
| `EARNING_PER_RESPONSE_USD` | Credit per accepted response |

**`client/.env.local`**:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Base URL of the API (e.g. `http://localhost:4000`) |

## Run commands

**Terminal 1 — API**

```bash
cd publisher-dashboard/server
npm run server
```

**Terminal 2 — Frontend**

```bash
cd publisher-dashboard/client
npm run dev
```

- Dashboard: [http://localhost:3000](http://localhost:3000) (redirects to `/dashboard` after login)
- API health: [http://localhost:4000/health](http://localhost:4000/health)
- Public respondent form: `http://localhost:3000/p/<surveyId>` (survey must be **active**)

## API overview

All JSON routes are under `/api`:

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/profile`, `POST /api/auth/change-password`
- **Surveys:** `GET/POST /api/surveys`, `GET/PUT/PATCH/DELETE /api/surveys/:id`, `GET /api/surveys/public/:id`, `POST /api/surveys/:id/responses`
- **Dashboard:** `/api/dashboard/stats`, `performance`, `responses-by-survey`, `completion-split`, `recent-activity`
- **Earnings / transactions / notifications / analytics / audience / AI** — see `server/src/routes/*.js`

## Features implemented

- JWT login/register (publishers), protected app routes
- Dashboard stats, line/bar/pie charts, recent activity, auto-insights
- Survey CRUD, status filters, active/inactive toggle (drafts publish from editor)
- Drag-and-drop question builder, conditional logic, preview, AI mock suggestions
- Audience table with filters; earnings balance, chart, withdrawals, history
- Analytics completion and drop-off charts; notifications list + header polling
- Settings: profile, password, UPI/bank, notification toggles
- Public fill form at `/p/[id]` for active surveys

## Production notes

- Set strong `JWT_SECRET`, HTTPS, and restrict `CLIENT_ORIGIN`.
- Use `next build` + `next start` for the frontend and process manager for Node.
