# DM Tiles — Building Measurement & Work Management System

Mobile-first web application and PWA for tiles and granite installation contractors to manage buildings, unlimited floors/rooms, accurate measurements, interactive 2D architectural floor plans, work progress, billing & payments, PDF/CSV reports, and WhatsApp client summaries.

## Project Structure

- `backend/` — Express.js REST API (`/api/v1`), PostgreSQL (`pg` raw SQL), JWT + bcrypt auth, Zod validation, `pdfkit` PDF generator, `multer` uploads (Supabase Storage or local fallback)
- `frontend/` — React 18 + Vite PWA, TanStack Query, React Hook Form + Zod, React Konva architectural floor plan editor, IndexedDB offline mutation queue
- `docs/ARCHITECTURE_AND_ROADMAP.md` — Architecture & database design reference

## Setup Instructions

### 1. Backend Environment & Database

```bash
cd backend
cp .env.example .env
```

Update `backend/.env`:
- `DATABASE_URL`: PostgreSQL or Supabase Postgres connection string
- `DB_SSL`: set `true` for Supabase / hosted Postgres
- `JWT_SECRET`: random secret (at least 32 characters)
- `CORS_ORIGIN`: frontend URL (e.g. `http://localhost:5173`)
- Optional Supabase Storage: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (falls back to `backend/uploads/` in local development when unset)

Install dependencies, run migrations, seed default room/work types, and start backend:

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Or build for production:

```bash
npm run build
```

## Running Tests

```bash
cd backend
npm test
```

## Installing as an Android PWA

1. Open the deployed HTTPS URL in Chrome on Android.
2. Tap Chrome's menu (`⋮`) and select **Add to Home screen** / **Install app**.
3. Measurements and work status edits made without signal are queued locally in IndexedDB and sync automatically once connectivity returns.

