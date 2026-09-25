# Aurora — Front-End

One codebase for the **Next.js web app** and the **Android app (Expo / React Native)**.
Screens are written once in `packages/app` and rendered by both apps.

## Quick start

```bash
corepack enable pnpm        # once per machine
pnpm install

pnpm web                    # Next.js on http://localhost:3000
pnpm mobile                 # Expo dev server (needs the Aurora dev client installed on a device/emulator)
```

The Android app uses a **development build**, not Expo Go (push notifications, biometrics, MMKV and
Clarity need native code). Build the dev client once, then reinstall only when native dependencies change:

```bash
cd apps/mobile
npx eas build --profile development --platform android   # cloud build → install the APK
# or, with Android Studio + SDK installed locally:
pnpm android
```

Copy `apps/web/.env.example` → `apps/web/.env.local` and `apps/mobile/.env.example` →
`apps/mobile/.env.local` and fill in the Supabase / Clarity values.

## Scripts (root)

| Command          | What it does                                     |
| ---------------- | ------------------------------------------------ |
| `pnpm web`       | Next.js dev server                               |
| `pnpm mobile`    | Expo dev server (dev client)                     |
| `pnpm android`   | Local native Android build + run                 |
| `pnpm build`     | Production build (web)                           |
| `pnpm typecheck` | TypeScript across every package                  |
| `pnpm test`      | Jest                                             |
| `pnpm lint`      | Biome lint + format check                        |
| `pnpm format`    | Biome auto-fix                                   |

## Layout

```
apps/
  mobile/     Expo Router shell: routes, native config, fonts, Clarity SDK, EAS
  web/        Next.js App Router shell: routes, next/font, Clarity script, Vercel
packages/
  app/        Shared screens (features/*), providers, hooks — most work happens here
  ui/         Shared primitives (react-native-reusables based): Button, Card, Text…
  api/        Supabase client, TanStack Query client, offline persistence, Zod schemas, storage
  i18n/       English + Bengali strings (i18next)
  tokens/     Design tokens + Tailwind preset used by both apps
  tsconfig/   Shared TypeScript config
docs/
  architecture.md   How the sharing works, conventions, open decisions
```

See [docs/architecture.md](docs/architecture.md) before adding a feature.

## Deploying

- **Web:** Vercel. Import the repo, set **Root Directory** to `apps/web`; Vercel detects pnpm + Turborepo.
  Add the `NEXT_PUBLIC_*` env vars in the Vercel project.
- **Android:** EAS Build (`apps/mobile/eas.json`): `development` (dev client APK), `preview` (internal
  APK for beta testers), `production` (Play Store AAB).
