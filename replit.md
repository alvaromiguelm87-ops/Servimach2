# Servimach

A full local services marketplace (Uber + Fiverr style) where clients discover and hire verified local professionals for everyday services — electricians, plumbers, mechanics, painters, cleaners, designers, developers, and more.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/servimach run dev` — run the React frontend (proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + Wouter routing + Lucide icons
- API: Express 5
- Auth: Replit Auth (OIDC with PKCE) via `@workspace/replit-auth-web`
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (auth.ts, users.ts, orders.ts)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/` — Orval-generated React Query hooks
- `lib/api-zod/src/generated/` — Orval-generated Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/servimach/src/pages/` — React pages (home, login, dashboard, orders, profile, admin)
- `artifacts/servimach/src/components/` — Shared UI components

## Architecture decisions

- **Column name mismatch**: Drizzle schema TypeScript names use camelCase but map to DB column names that differ from the schema's default snake_case (e.g., `professionalsTable.profileId` maps to `user_id`; `ordersTable.clientProfileId` maps to `client_id`). This is because the tables were created manually with simpler column names. The Drizzle column string overrides (`integer("user_id")`) are the source of truth.
- **Auth flow**: Replit OIDC → callback creates/upserts `users` table → session cookie → `profiles` table for app-level data. `profiles.auth_id` FK → `users.id`.
- **Commission model**: 10% platform fee on every completed order. `commission = price × 0.10`, `professional_earnings = price × 0.90`.
- **Professional profiles**: Two-tier — all users have a `profiles` record (role: client/professional/admin). Professionals additionally have a `professionals` record with profession details.
- **Unauthenticated browsing**: The marketplace homepage and professional profiles are publicly viewable. Auth is only required to place orders or manage listings.

## Product

- **Marketplace home**: Search + category filter across all professionals, card grid with ratings
- **Professional profile**: Full profile with WhatsApp contact, ratings, reviews, "Pedir serviço" order CTA
- **Orders**: Full order lifecycle (pending → accepted → completed/rejected) with 10% commission tracking
- **Dashboard**: Role-aware — clients see spend/active orders; professionals see earnings, commission, ratings
- **Profile editor**: Set name, role, WhatsApp, location; switch to professional with profession fields
- **Admin panel**: Platform-wide stats, user list, orders list
- **Auth**: Replit Auth (OIDC) with session cookies; login redirects back to origin

## User preferences

- UI language: Portuguese (pt-PT)
- Design: dark mode by default, warm amber accent (#F59E0B), premium/dense feel
- No emojis in the UI

## Gotchas

- **Do not run drizzle push** on existing tables without checking column names — the DB was created manually with simpler column names (`client_id` not `client_profile_id`). The schema files have explicit column name overrides.
- **API server must rebuild before serving** — the dev script runs `pnpm run build && pnpm run start`. Changes to routes require restarting the workflow.
- **Auth users seed**: Demo professional accounts exist with `id` prefix `demo-*` in the `users` table. Do not delete them or the professionals seeded data breaks.
- When passing `enabled` option to Orval hooks, also pass the `queryKey` param.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.local/skills/replit-auth/SKILL.md` for auth flow details
