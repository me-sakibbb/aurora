# Architecture

## The core idea: write each screen once

Both apps are thin shells. Everything user-facing lives in shared packages and is written with
React Native primitives (`View`, `Text`, `Pressable`…) styled with NativeWind (Tailwind classes).

- **Android:** Expo renders the RN components natively.
- **Web:** Next.js renders the same components through **react-native-web** (RN → DOM), with
  NativeWind's classes compiled to real CSS by Tailwind.

```
packages/app/features/home/screen.tsx      ← the screen (shared)
apps/mobile/app/index.tsx                  ← 1-line route: export { HomeScreen as default }
apps/web/app/page.tsx                      ← 1-line route: 'use client' + same export
```

## Adding a screen

1. Build it in `packages/app/features/<feature>/<name>-screen.tsx`. Start the file with `'use client'`.
2. Add the route in **both** apps, re-exporting the screen:
   - `apps/mobile/app/<path>.tsx`
   - `apps/web/app/<path>/page.tsx` (`'use client'` at the top)
3. Keep URL paths identical on both platforms. Navigate with Solito (`solito/link`, `solito/navigation`)
   so the same link works in Expo Router and Next.js, and deep links from notifications map 1:1.

## Platform-specific code

Use file extensions, never `if (Platform.OS === …)` for whole implementations:

- `thing.ts` → **web** (and the default)
- `thing.native.ts` → **Android/iOS**

Both files must export the same API. Examples: `packages/api/src/storage/*`, `packages/api/src/lifecycle*.ts`,
`packages/app/provider/safe-area/*`. Small styling tweaks can use `Platform.select` inline.

Important: this works only through **relative imports or a package's `main` entry**. Don't add
`exports` maps to workspace packages; Metro doesn't apply platform extensions to `exports` targets.

## Styling & design tokens

- Tokens live in `packages/tokens/index.js` (colors as HSL triplets, radius, fonts). **They are
  placeholders.** There are no designs yet.
- `packages/tokens/preset.js` turns them into a Tailwind preset + CSS variables and is used by both
  `apps/*/tailwind.config.js`. Change a token once and both platforms update.
- Color names follow shadcn/react-native-reusables (`bg-primary`, `text-muted-foreground`…), so
  reusables components drop in unchanged.
- Dark mode: tokens exist (`colors.dark`), but it's not designed or enabled (outside the quoted scope).
- Fonts: **Noto Sans Bengali is a placeholder** until the final font is chosen. Native needs one family per
  weight (`font-medium`/`font-semibold`/`font-bold` are mapped in the preset); web uses `next/font`
  exposed as `--font-sans`.

### Adding UI primitives (react-native-reusables)

`packages/ui/components.json` is configured for the reusables CLI:

```bash
cd packages/ui
npx @react-native-reusables/cli@latest add <component>
```

Components import each other as `@aurora/ui/...`. That works because `@aurora/ui` is also linked at
the workspace root. Review each added component: some need extra `@rn-primitives/*` deps.

## Data layer (`packages/api`)

- **Supabase** (`getSupabase()`): lazily created, so the app runs before env vars exist. Session is
  stored in the Android Keystore via SecureStore (chunked) on native, and localStorage on web.
  Replace `database.types.ts` with generated types once the backend project exists.
- **TanStack Query** (`createQueryClient()`): `networkMode: 'offlineFirst'`, and the cache is persisted
  (MMKV on native, IndexedDB on web) so screens show last-known data instantly and offline.
- **Offline writes (F6, F15):** mutations made offline are paused, persisted and replayed on reconnect
  / next launch (`resumePausedMutations` in the provider). **For a mutation to survive an app
  restart, its function must be registered by key**, because functions can't be serialized:

  ```ts
  queryClient.setMutationDefaults(['food-log', 'create'], { mutationFn: createFoodLog });
  // then in the screen:
  useMutation({ mutationKey: ['food-log', 'create'] });
  ```

  Do this for every "must not lose it" write (food log, mood entry, cycle log).
- **Zod schemas** in `packages/api/src/schemas` are shared by forms (react-hook-form +
  `@hookform/resolvers/zod`) and response parsing. Error messages are i18n keys.
- **Business rules stay on the backend** (per the contract): the app never computes calories,
  scores, streaks, fertile windows or eligibility. It displays what the API returns.

## Auth (F1)

- **Screens** (`packages/app/features/auth`): `/login` (Sign in / Create account tabs + Google),
  `/forgot-password`, `/reset-password`, `/auth/callback` (Google on web + every email link).
- **Gate** (`auth-gate.tsx`, mounted by the shared `Provider`): signed out → `/login?next=…`, signed in
  with no `onboarding_responses` row → `/onboarding`, otherwise home. The rules are the pure function
  `resolveAuthRedirect` in `packages/api/src/auth/routing.ts` (unit tested). After F2 completes, invalidate
  `onboardingQueryKey(userId)`.
- **Google**: web uses Supabase's redirect flow; Android uses the native account picker
  (`@react-native-google-signin/google-signin`) + `signInWithIdToken`. Split in `auth/google(.native).ts`.
- **Not approved** (backend contract): the Supabase *before user created* hook rejects non-allowlisted
  emails with the message `not_allowlisted`. `toAuthErrorKind` maps it to the friendly "not on the beta
  list" panel, separate from `invalid_credentials` (wrong password). See `auth/errors.ts`.
- **Session** lives in SecureStore/localStorage and survives offline launches; sign-out clears the query
  cache (shared phones).
- **Supabase dashboard setup** (backend): Redirect URLs `aurora://auth/callback`,
  `https://<web-domain>/auth/callback`, `http://localhost:3000/auth/callback`; Google provider with the
  Web client ID (plus the Android client with package name + SHA-1 in the same Google Cloud project).

## i18n (`packages/i18n`)

- English is the default. Bengali is a user toggle (`useLanguage()` in `packages/app/lib/language.ts`),
  persisted in `kv`.
- Every user-facing string goes through `t('…')`. Keys are type-checked against `en.json`, and
  every key must also exist in `bn.json`.
- Design for Bengali text running longer than English (F23/P3).

## Native-only features

| Feature                    | Native                         | Web                                         |
| -------------------------- | ------------------------------ | ------------------------------------------- |
| Push (F20+)                | `expo-notifications` → Expo Push | Web Push API + service worker (VAPID)     |
| App lock (P10)             | `expo-local-authentication`    | Not available (Discreet Mode lock screen only) |
| Secure session storage     | `expo-secure-store`            | localStorage (Supabase default)             |
| Analytics (F14)            | `@microsoft/react-native-clarity` | Clarity script tag in `app/layout.tsx`   |

Native modules are already installed and configured, so the dev client doesn't need rebuilding
for them later. **Rebuild the dev client whenever a native dependency is added or upgraded.**

## Known gotchas

- **Turbopack + NativeWind:** `jsxImportSource: "nativewind"` must be set directly in
  `apps/web/tsconfig.json`. Turbopack ignores it when inherited through `extends`, and `className`
  is then silently dropped on web. Symptom: elements only have `css-xxxx` classes.
- **Tailwind vs react-native-web precedence (web):** RNW injects reset classes for every View/Text
  (`background-color: transparent`, `flex-direction: column`…) *after* Tailwind's stylesheet, with the same
  specificity, so they silently win. `important: 'html'` in `apps/web/tailwind.config.js` fixes it. Symptom:
  classes are present in the HTML but colors/`lg:` layout don't apply (page looks unstyled).
- **One React copy:** `pnpm-workspace.yaml` pins `react`/`react-dom` via `overrides` to the Expo SDK's
  version. When upgrading Expo, run `npx expo install --fix` in `apps/mobile` and update the overrides.
- **pnpm hoisted linker** (`nodeLinker: hoisted`) is required for Metro.
- **Tailwind v3 + NativeWind v4:** NativeWind v5 (Tailwind v4) was still a release candidate at setup.
  Tailwind-merge stays on v2 to match Tailwind v3.
- **React strict mode is off on web**, because Reanimated doesn't support it.

## Open decisions / TODO before launch

- [ ] **Android application ID**: placeholder `com.aurora.app` in `apps/mobile/app.config.ts`. It must
      be final before the first Play Store upload.
- [ ] **Final Bengali font** (currently Noto Sans Bengali).
- [ ] **Designs / real tokens**: none yet. Tokens are placeholders.
- [ ] **Backend API shape**: assumed Supabase (supabase-js + generated types). Confirm with the backend team.
- [ ] **Push**: backend sends via Expo Push (Android) and Web Push/VAPID (web). Needs `google-services.json`
      (FCM) for Android and a VAPID public key for web.
- [ ] **Auth config**: F1 front end is built. Still needed: the `not_allowlisted` auth hook (backend),
      Google OAuth client IDs (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`), and the redirect URLs above.
- [ ] GitHub remote + Vercel project (web) + `eas init` (mobile).
