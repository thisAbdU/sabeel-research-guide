# Backend

Next.js route handlers on port **3001**. Person A’s app should send:

```
Authorization: Bearer <accessToken>
```

## 1. Create the Supabase project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a project.
2. Project Settings → API: copy **Project URL** and **anon public** key.
3. Keep the **service_role** key for later admin work. Do not send it to the frontend.
4. Authentication → Providers → Email: turn **off Confirm email** while developing locally.

## 2. Create tables

SQL Editor → run `../supabase/migrations/0001_init.sql`.

That creates `users`, `conversations`, `messages`, `research_projects`, `funding_matches`, `support_settings`, `support_transactions`, RLS, and a trigger that inserts `public.users` on signup.

## 3. Connect the backend

```bash
cp .env.example .env.local
```

Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

```bash
pnpm install
pnpm dev
```

## Auth

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/auth/signup` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | bearer |
| GET | `/api/auth/me` | bearer |

All other `/api/*` routes require a bearer token.

## Product routes

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/chat` | list conversations, or `?conversationId=` |
| POST | `/api/chat` | save a user message (no model reply yet) |
| GET | `/api/research` | own projects, or `?published=true` |
| POST | `/api/research` | create |
| GET/PATCH/DELETE | `/api/research/[id]` | |
| GET | `/api/funding?researchProjectId=` | |
| POST | `/api/funding` | save a match (no generator yet) |
| GET/PUT | `/api/support` | settings; support requires a published project |
| POST | `/api/support` | create a pending tip |
| POST | `/api/voice` | `501` until STT/TTS is wired |
