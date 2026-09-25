# Aurora front-end: notes for Claude

Universal app: one codebase → Next.js web app + Android app (Expo). Read `docs/architecture.md` first.

## Stack (versions pinned at setup, Sep 2026)
pnpm 12 workspaces (hoisted linker) + Turborepo · Expo SDK 57 / RN 0.86 / React 19.2.3 · Expo Router ·
Next.js 16 (App Router, Turbopack) + react-native-web + Solito 5 · NativeWind 4 + Tailwind 3 ·
react-native-reusables-style primitives · TanStack Query 5 (persisted, offline-first) · Zod 4 ·
supabase-js · MMKV 4 / IndexedDB · i18next · Biome · Jest (jest-expo).

## Rules
- Screens and UI go in `packages/app` / `packages/ui`, **never** duplicated per app. App folders only
  hold thin route files, platform config and root layouts.
- Platform differences go in `*.native.ts(x)` vs `*.ts(x)` (web) files with identical exports. Don't add
  `exports` maps to workspace packages (Metro skips platform extensions for them).
- Style with NativeWind `className` using token names (`bg-primary`, `text-muted-foreground`). No raw
  hex colors or ad-hoc font families; add tokens in `packages/tokens` instead.
- All user-facing text via `t()` from `@aurora/i18n`. Add keys to both `en.json` and `bn.json`.
- No business logic in the client: calorie ranges, streaks, chips, fertile windows, eligibility,
  suggestions and chat safety decisions all come from the backend and are displayed as returned.
  Disclaimer and fertile-window wording must be shown in full, exactly as provided.
- Every data screen needs loading / empty / error / offline states (F15). "Must not lose it" writes use
  keyed mutations registered with `setMutationDefaults` (see architecture doc).
- Add native deps with `npx expo install <pkg>` inside `apps/mobile` (SDK-compatible versions), then
  remind the user the dev client needs rebuilding.
- React must stay a single copy. Don't bump `react` without updating `overrides` in `pnpm-workspace.yaml`.

## Verify changes
`pnpm typecheck && pnpm lint && pnpm test`, then `pnpm --filter @aurora/web build`. For native bundling:
`cd apps/mobile && npx expo export --platform android --output-dir <tmp>`. After a web build, a
`className` check in `.next/server/app/index.html` confirms NativeWind is active on web.

## Formatting
Biome: 2 spaces, single quotes, semicolons, trailing commas, width 100. Run `pnpm format`.
