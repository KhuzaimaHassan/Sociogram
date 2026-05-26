# Sociogram

A privacy-first social feed where you react with your **face**. Facial expression detection runs entirely **on-device** with face-api.js — no images ever leave the browser, only the detected emotion label.

> Status: **Phase 2 — Backend wired up.** Frontend is connected to a Node + Express + Prisma + Postgres API with JWT auth, posts, likes, comments, follows, and emoji reactions.

---

## 1. Repository layout

```text
Sociogram/
├── public/
│   └── models/                  # face-api.js model weights (already downloaded)
├── src/                         # React (Vite) frontend
│   ├── components/
│   ├── context/                 # AuthContext, AppContext, ExpressionContext
│   ├── hooks/
│   ├── pages/                   # Home, Explore, Reels, Profile, Settings, Login, Register, CreatePost
│   ├── services/                # apiClient + auth/post/user services
│   └── utils/
├── sociogram-backend/           # Node + Express + Prisma backend
│   ├── prisma/                  # schema.prisma + seed.cjs
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       └── utils/
├── docker-compose.yml           # Local Postgres in one command
├── render.yaml                  # Render.com Blueprint for backend + DB
├── vercel.json                  # Vercel SPA config for frontend
└── start-pg.bat                 # Windows helper to start local PostgreSQL
```

---

## 2. Prerequisites

- **Node.js 18+** (20+ recommended)
- **PostgreSQL** — pick **one** of:
  - Local install (Windows: included PostgreSQL 18 + the bundled `start-pg.bat`)
  - **Docker** (`docker compose up -d` — easiest cross-platform option)
  - Managed cloud (Neon, Railway, Supabase, etc.)

---

## 3. Local development (first run)

### 3.1. Install dependencies

```bash
# In the repo root
npm install

# In the backend
cd sociogram-backend
npm install
cd ..
```

### 3.2. Start PostgreSQL

Pick **one** of the options below.

#### Option A — Docker (recommended)

```bash
docker compose up -d
```

This starts a clean Postgres 16 instance on `localhost:5432` with user/password/db all set to `sociogram`.

Update `sociogram-backend/.env` accordingly:

```env
DATABASE_URL="postgresql://sociogram:sociogram@localhost:5432/sociogram?schema=public"
```

#### Option B — Local install (Windows)

Right-click `start-pg.bat` → **Run as Administrator**. It starts the `postgresql-x64-18` service and creates the `sociogram` database. Default credentials in `sociogram-backend/.env` already match.

#### Option C — Managed cloud (Neon / Railway / Supabase)

Create a database and paste the connection string into `sociogram-backend/.env` as `DATABASE_URL`.

### 3.3. Configure environment

```bash
# Backend env
cp sociogram-backend/.env.example sociogram-backend/.env

# Frontend env (optional for local dev — defaults to http://localhost:3001)
cp .env.example .env
```

For production-grade secrets, generate strong values:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3.4. Migrate + seed the database

```bash
cd sociogram-backend
npx prisma generate
npm run db:push        # creates tables from prisma/schema.prisma
npm run db:seed        # inserts demo users + posts + reactions
cd ..
```

Demo login: `demo@sociogram.app` / `password123`.

### 3.5. Run the apps

In **two terminals**:

```bash
# Terminal 1 — backend
cd sociogram-backend
npm run dev
# 🚀 Sociogram API running at http://localhost:3001

# Terminal 2 — frontend
npm run dev
# Local: http://localhost:5173
```

Open <http://localhost:5173>, log in with the demo account (pre-filled), and start scrolling. Allow camera access when prompted to enable expression reactions.

---

## 4. How the application flows

```text
          ┌────────────────┐    JWT (Bearer)     ┌──────────────────┐
          │  React (Vite)  │ ───────────────────▶│  Express + Prisma │
          │   face-api.js  │ ◀───────────────────│   PostgreSQL DB   │
          └────────────────┘     JSON / multipart └──────────────────┘
                  ▲
                  │  on-device only
                  │  (camera frame ➜ emotion label)
            ┌──────────┐
            │  Camera  │
            └──────────┘
```

- **Authentication** — `/api/auth/login` returns `{ user, accessToken, refreshToken }`. The frontend stores tokens in `localStorage`, attaches `Authorization: Bearer <accessToken>` to every request, and silently refreshes on 401 `TOKEN_EXPIRED`.
- **Feed** — `GET /api/posts/feed` returns posts from users you follow plus your own, with normalized `reactions`, `liked`, and `myReaction` fields.
- **Passive reactions** — when a post is on screen for ≥ 5 s (`useDwell`), the frontend captures one camera frame, runs `face-api.js`, maps the emotion → emoji, and `POST /api/posts/:id/react` with `source: "expression"`. A 3-second toast offers Undo.
- **Posting** — `POST /api/posts` accepts a multipart form with `media`, `caption`, `location`, `isReel`. Files land in `/uploads` on the backend and are served from `${VITE_API_URL}/uploads/<filename>`.

---

## 5. API surface (what the frontend consumes)

| Method | Path                                  | Auth | Purpose                          |
| ------ | ------------------------------------- | ---- | -------------------------------- |
| POST   | `/api/auth/register`                  | —    | Create account, returns tokens   |
| POST   | `/api/auth/login`                     | —    | Email + password → tokens        |
| POST   | `/api/auth/refresh`                   | —    | Exchange refresh → new pair      |
| GET    | `/api/auth/me`                        | ✅   | Current user with counts         |
| GET    | `/api/posts/feed?cursor=...`          | ✅   | Personalized feed                |
| GET    | `/api/posts/explore?cursor=...`       | ✅   | Global feed                      |
| POST   | `/api/posts`                          | ✅   | Create post (multipart)          |
| GET    | `/api/posts/:id`                      | ✅   | Single post + comments           |
| DELETE | `/api/posts/:id`                      | ✅   | Delete own post                  |
| POST   | `/api/posts/:id/like`                 | ✅   | Like                             |
| DELETE | `/api/posts/:id/like`                 | ✅   | Unlike                           |
| POST   | `/api/posts/:id/react`                | ✅   | Add/replace emoji reaction       |
| DELETE | `/api/posts/:id/react`                | ✅   | Clear emoji reaction             |
| GET    | `/api/posts/:id/comments`             | ✅   | List comments                    |
| POST   | `/api/posts/:id/comments`             | ✅   | Add comment                      |
| DELETE | `/api/comments/:id`                   | ✅   | Delete own comment               |
| GET    | `/api/users/:username`                | ☑️   | Profile + own posts (auth opt.)  |
| PUT    | `/api/users/me`                       | ✅   | Edit display name / bio / avatar |
| POST   | `/api/users/:id/follow`               | ✅   | Follow user                      |
| DELETE | `/api/users/:id/follow`               | ✅   | Unfollow user                    |
| GET    | `/api/users/search?q=...`             | ✅   | Username/display search          |

---

## 6. Production deployment

The recommended split:

| Tier      | Provider                | What ships                          |
| --------- | ----------------------- | ----------------------------------- |
| Frontend  | **Vercel**              | Static Vite build (`/` repo root)   |
| Backend   | **Render** (or Railway) | `sociogram-backend/` Node service   |
| Database  | **Render Postgres** or **Neon** | Managed PostgreSQL          |

> HTTPS is **required** for camera access on mobile devices. Vercel and Render both serve HTTPS by default, so this works out of the box once deployed.

### 6.1. Deploy the backend (Render Blueprint)

1. Push this repo to GitHub.
2. Visit <https://dashboard.render.com/blueprints> → **New Blueprint** → pick this repo.
3. Render reads `render.yaml` and provisions:
   - `sociogram-db` Postgres instance.
   - `sociogram-api` web service (`sociogram-backend/` as root).
4. Set the `FRONTEND_URL` env var to your future Vercel URL (you can edit it after step 6.2).
5. After first deploy, open the service shell and run `npm run db:seed` if you want demo data.

### 6.2. Deploy the frontend (Vercel)

1. Visit <https://vercel.com/new> → import this repo.
2. Framework auto-detects as Vite. Output dir is `dist` (already in `vercel.json`).
3. Add env var **`VITE_API_URL`** = your Render API URL (e.g. `https://sociogram-api.onrender.com`).
4. Deploy. Open the deploy URL on your phone, log in, and the camera will work over HTTPS.

### 6.3. Update CORS

After the Vercel URL is live, set `FRONTEND_URL` on Render to that URL and redeploy. The backend's CORS middleware reads this on boot.

---

## 7. Available scripts

### Frontend (repo root)

| Command           | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Vite dev server with `/api` proxy            |
| `npm run build`   | Production build to `dist/`                  |
| `npm run preview` | Preview the production build locally         |
| `npm run lint`    | Run ESLint                                   |

### Backend (`sociogram-backend/`)

| Command                   | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `npm run dev`             | Start API with auto-reload                 |
| `npm start`               | Start API (production)                     |
| `npm run db:push`         | Sync `schema.prisma` → DB (no migrations)  |
| `npm run db:migrate`      | Create and apply a new migration           |
| `npm run db:seed`         | Insert demo users, posts, reactions        |
| `npm run db:studio`       | Open Prisma Studio (visual DB browser)     |

---

## 8. Privacy guarantees

- The camera stream is opened only **after** the user grants explicit consent (`ExpressionProvider`).
- Frames are drawn to a hidden canvas, run through `tinyFaceDetector` + `faceExpressionNet`, and **discarded** immediately.
- Only the resulting emoji string ever reaches the backend (`POST /api/posts/:id/react`).
- Disabling expression reactions in **Settings** stops the camera tracks immediately.

---

## 9. Troubleshooting

- **`Can't reach database server` on `db:push`** — make sure Postgres is actually running and `DATABASE_URL` matches its credentials. With Docker: `docker compose ps` should show `db (healthy)`.
- **`401 Token expired` loop** — clear `localStorage` (`sociogram_access_token`, `sociogram_refresh_token`) and log in again.
- **Camera never turns on** — browser blocked the permission, or you're on plain `http://` from a non-localhost origin. Use HTTPS or `localhost`.
- **Models failed to load** — check that `public/models/` contains the four `*-shard1` and manifest files. If missing, run `node download-models.cjs` from the repo root.

---

## 10. Roadmap

- [ ] Cloudinary / S3 for media storage
- [ ] Real-time notifications via WebSockets
- [ ] Stories implementation backed by API
- [ ] Reels infinite-scroll with prefetch
- [ ] Server-side aggregation for trending feed
- [ ] Cypress / Playwright e2e tests
