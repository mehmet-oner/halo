# Repository Guidelines

## Project Structure & Module Organization
Halo uses the Next.js App Router. `app/` holds route segments; `app/page.tsx` renders the interactive status hub and `app/layout.tsx` defines the HTML scaffolding and font stack. Shared UI belongs in `components/`, while feature-specific pieces can live beside the consuming route. Tailwind tokens and global tweaks stay in `app/globals.css`. Store static assets in `public/` with kebab-case filenames and reference them via absolute paths. Keep root configs (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`) aligned with any platform or tooling change.

## Build, Test, and Development Commands
- `npm run dev`: start the Turbopack dev server on http://localhost:3000 for hot reload.
- `npm run build`: generate the production bundle; run before merge to surface type or routing issues.
- `npm run start`: serve the built bundle for smoke testing.
- `npm run lint`: execute the enforced ESLint config; treat warnings as blockers.

## Coding Style & Naming Conventions
Write TypeScript with JSX, 2-space indentation, and single quotes as in `app/page.tsx`. Components, hooks, and providers use PascalCase filenames (`components/GroupPanel.tsx`), while utilities stay camelCase. Default to server components; add `'use client'` only when stateful hooks or browser APIs are unavoidable. Favor Tailwind utility groupings over ad hoc CSS and remove unused mock data once production integrations land.

## Testing Guidelines
No automated suite exists yet. Place new tests adjacent to the feature in `app/**/__tests__` or at the repo root under `tests/` with `.test.tsx` suffixes. Use React Testing Library with Vitest or Jest to exercise status updates, timers, and Supabase flows. Document expected coverage and include both `npm run build` and `npm run lint` outputs in review notes; add a `test` npm script when the first suite lands.

## Commit & Pull Request Guidelines
Keep commits small, imperative, and present tense (for example, `add quick status presets`). Pull requests should summarize the change, link issues or specs, and attach UI screenshots or clips when styling shifts. Include a testing checklist covering `npm run build`, `npm run lint`, and any manual QA. Call out risks, flagged TODOs, and dependencies so reviewers can respond quickly.

## Configuration Tips
Supabase helpers require environment variables; document new keys in `.env.example` and avoid committing real secrets. When adjusting Tailwind or ESLint configs, note the rationale in the PR so future contributors understand broader impacts.
