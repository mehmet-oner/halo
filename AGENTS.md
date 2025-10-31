# Halo Repository Guide

## Layout & Ownership
- `src/app/` contains all Next.js App Router routes and layout scaffolding. Client entry points live under `src/app/(route)/page.tsx`; shared layout/bootstrap lives in `src/app/layout.tsx` and global styles in `src/app/globals.css`.
- `src/components/` hosts reusable UI. Domain areas are namespaced (for example `dashboard/`, `auth/`, `landing/`), and each directory may include client components, hooks, and supporting UI primitives.
- `src/hooks/`, `src/services/`, and `src/utils/` provide cross-feature logic (React hooks, network/service abstractions, and pure utilities respectively).
- `src/types/` centralises shared TypeScript shapes (`navigation`, `groups`, `polls`, `todos`, etc.).
- `public/` holds static assets referenced via absolute URLs. Config files (`tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`) remain at the repo root.

## Key Application Flows
- Status management is driven via `useStatus` (polling, formatting, expiration) and consumed by `Dashboard` and `StatusPanel`.
- Polls and todos share validation helpers in `src/utils/list.ts` to avoid divergent logic for option/item deduplication.
- Modals (`CreateGroupDialog`, `InviteMembersDialog`, `LeaveGroupDialog`) share common overlay behaviour through `src/components/ui/Modal.tsx`.

## Environment & Configuration
- Supabase environment variables must be set in `.env.local` (see `.env.example` when present). Do not commit secrets.
- Tailwind utility classes are preferred; any global overrides belong in `src/app/globals.css`.
- Update root configs when modifying TypeScript paths, ESLint rules, or build tooling. `tsconfig.json` already points `@/*` to `./src/*`.

## Commands
- `npm run dev` – launch the Turbopack dev server at `http://localhost:3000`.
- `npm run lint` – run the enforced ESLint rules (treat warnings as failures).
- `npm run build` – production build (uses Next.js’ default webpack pipeline for portability).
- `npm run start` – serve the production bundle after a successful build.

## Testing & QA
- Automated tests have not landed yet. New suites should live alongside features (`src/**/__tests__`) or under `tests/` using Vitest or Jest with React Testing Library.
- Document manual QA in PRs, and include `npm run lint` plus `npm run build` output (or note any environment-specific build blockers).

## Contribution Notes
- TypeScript + JSX with 2-space indentation; single quotes are standard.
- Favour server components unless a client directive is required (state, effects, browser APIs).
- Keep commits scoped, using imperative present tense (`add group modal`). PRs should explain the change, risks, and testing performed, and include UI screenshots for visual updates.
