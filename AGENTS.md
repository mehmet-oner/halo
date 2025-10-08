# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts App Router routes; `page.tsx` renders the interactive status hub while `layout.tsx` declares fonts and HTML scaffolding.
- `app/globals.css` centralizes Tailwind CSS v4 tokens via `@theme inline`; make global palette or typography edits here.
- `public/` stores static assets consumed by `next/image`; keep filenames kebab-case and reference with absolute paths.
- Root-level configs (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`) should evolve in tandem with related feature work.

## Build, Test, and Development Commands
- `npm run dev` starts the Next.js dev server with Turbopack at http://localhost:3000 for live iteration.
- `npm run build` compiles a production bundle; run before merge to surface type, route, or config issues.
- `npm run start` serves the bundled app for smoke-testing production behavior locally.
- `npm run lint` executes ESLint; keep the tree warning-free to match the enforced config.

## Coding Style & Naming Conventions
- Use TypeScript with JSX, 2-space indentation, and single quotes as shown in `app/page.tsx`.
- Components and shared modules follow PascalCase filenames (`GroupPanel.tsx`), while helpers remain camelCase.
- Default to server components; add `'use client'` only when local state, effects, or browser APIs are required.
- Rely on Tailwind utility classes for styling; group related utilities and prune unused mock data when wiring real services.

## Testing Guidelines
- No automated tests exist yet; add new suites alongside features in `app/**/__tests__` or a top-level `tests/` directory with `.test.tsx` suffixes.
- Prefer React Testing Library with Vitest or Jest to cover state changes (status updates, poll voting, timers).
- Document expected coverage in the PR, and run both the test runner and `npm run lint` before requesting review.

## Commit & Pull Request Guidelines
- Keep commits small, imperative, and present-tense (`add quick status presets`, `refine poll modal copy`), consistent with existing history.
- PRs must include a summary, testing checklist (`npm run build`, `npm run lint`, manual QA), and screenshots or clips for UI adjustments.
- Link related issues or specs, call out known risks, and request reviews from owners of the affected area.
