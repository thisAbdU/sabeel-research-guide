# ScholarXiv Research Companion

A research workflow app for turning a rough idea into a clear question, finding related papers on ScholarXiv, matching grant opportunities, and publishing work for others to find and support.

## What it does

| Feature | What you get |
| --- | --- |
| **Vent** | Talk through a vague interest until you have a focused research question, with related ScholarXiv papers attached |
| **Roast** | Get a sharp critique of your question — ambiguous variables, missing populations, weak framing |
| **Get Funding** | Match your project to foundations and grant programs with links and rationale |
| **Discover** | Browse published projects from other researchers; tip authors when support is enabled |
| **Dashboard** | Manage your projects, funding matches, visibility, and support settings |

Chat supports text and voice. Auth is email/password via Supabase.

## Stack

| Directory | Role | Port |
| --- | --- | --- |
| `frontend/` | Next.js UI | 3000 |
| `backend/` | Next.js API (route handlers) | 3001 |
| `supabase/` | PostgreSQL schema (migrations) | — |

Requires [pnpm](https://pnpm.io) and a [Supabase](https://supabase.com) project.

## Setup

### 1. Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Project Settings → API: copy **Project URL**, **anon**, and **service_role** keys.
3. Authentication → Providers → Email: turn **off** “Confirm email” for local development.
4. SQL Editor → run every file in `supabase/migrations/` in order (`0001` … `0006`).

### 2. Backend

```bash
cd backend
cp .env.example .env.local
```

Fill in at least:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_ORIGIN=http://localhost:3000
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
SCHOLARXIV_API_KEY=
```

Optional keys (funding search, tip payments, voice): `EXA_AI_API_KEY`, `LINKS_ET_API_KEY`, `VOXIDE_PUBLIC_KEY`. See `backend/.env.example`.

```bash
pnpm install
pnpm dev
```

API runs at http://localhost:3001. Route details: `backend/README.md`.

### 3. Frontend

```bash
cd frontend
```

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Optional for voice: `VOXIDE_PUBLIC_KEY=` (same value as the backend).

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Local workflow

1. Start the backend (`pnpm dev` in `backend/`).
2. Start the frontend (`pnpm dev` in `frontend/`).
3. Sign up at `/signup`, then use `/chat`, `/discover`, and `/dashboard`.
