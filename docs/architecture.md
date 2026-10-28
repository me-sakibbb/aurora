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
- **Gate** (`auth-gate.tsx`, mounted by the shared `Provider`): signed out → `/onboarding` from the app
  root (Welcome + pre-sign-up questions) or `/login?next=…` from other pages; signed in with no
  `onboarding_responses` row → `/onboarding`, otherwise home. The rules are the pure function
  `resolveAuthRedirect` in `packages/api/src/auth/routing.ts` (unit tested).

## Onboarding (F2)

- One route, `/onboarding`, runs the whole flow. Step order and visibility (signed in/out, platform,
  male → no cycle steps) are pure functions in `packages/api/src/onboarding/flow.ts` (unit tested).
- Answers live in an on-device draft (`features/onboarding/draft-store.ts`, zustand persisted to `kv`)
  so pre-sign-up answers survive sign-up (including Google's redirect on web) and app restarts. It's
  cleared after a successful submit and on sign-out.
- Everything is sent once, at the last step, to the FastAPI `POST /api/v1/onboarding`
  (`buildOnboardingPayload`). On success the client sets `onboardingQueryKey(userId)` to `true` so the
  gate sends the person home; the backend must write the `onboarding_responses` row for that to stick.
- Sandbox meals come from `GET /api/v1/food/recipes`. No calorie numbers are computed in the client.
- Push token registration and the real home-screen widget are not built yet (backend endpoints/keys
  pending). Only the opt-ins are recorded.
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

## App shell & Home (F4)

- **Top bar** (`shell/top-bar.tsx`): one fixed `AppTopBar` drawn by the shell (web `AppShell`,
  native `(tabs)/_layout.tsx`): section title from the route, route actions (Cycle's settings
  button once opted in) and `ProfileButton` (avatar → profile sheet, hidden at `lg` where the
  sidebar shows it). Content scrolls under it, so screens don't add the top safe-area inset or their
  own title row. Pushed screens in `STANDALONE_PATHS` (mood) render `<AppTopBar back />` themselves.
- **Shell** (`packages/app/features/shell`): Home, Food, Ask Aurora, and either Cycle (see the
  Cycle section for who sees it, F13) or Insights, around a central Log button that opens the
  quick-log sheet. Native: `apps/mobile/app/(tabs)/_layout.tsx` (Expo Router `Tabs` with the shared
  `AppTabBar`). Web: the `(app)` route group's layout renders `AppShell` (sidebar at `lg+`, tab bar
  below). Sheets (quick log, F24 profile) live in a zustand store and are drawn once by the shell.
- **Home** (`features/home`): live data comes from `GET /profile` (target, goals, discreet mode),
  `GET /ovulation` (cycle preview) and `GET /food/suggestions/{user_id}`. Sections with no endpoint
  yet (daily summary, week/streak/chips, insights, Aurora noticed, recent logs, mood) use
  `features/home/demo.ts`, shaped like `packages/api/src/home/types.ts` (the proposed contract), and
  show a "Preview" badge. Suggestions fall back to the sample while the endpoint fails.
- Chat, Insights and Mood are "coming soon" placeholders (`features/placeholders`).

## Cycle tracking (F10, F11, F13)

- **Data**: settings, opt-in and the fertile window come from FastAPI `GET/POST /ovulation`
  (`packages/api/src/cycle/api.ts`). Period start/end dates are read and written straight to the
  Supabase `cycle_logs` table (RLS: own rows only) because the backend has no cycle-log endpoints.
  The fertile-window opt-in is written to the person's own `profiles.wants_fertility_estimate` row
  for the same reason. Symptoms and flow aren't built yet.
- **Setup** marks the last period as a start→end span on the calendar (or "still going" / "don't
  remember"). Saving sends the start to `POST /ovulation` *and* writes it as the first `cycle_logs`
  entry, so it shows in History. After setup, period dates are only edited in History; the settings
  sheet covers cycle length, the fertile-window choice and turning tracking off.
- **Who sees it** (`cycleAccess` in `packages/api/src/cycle/access.ts`, unit tested): opted-in
  accounts get the tab and cycle cards; accounts whose profile `sex` is female/other are offered the
  tab, and opening it runs the setup questions; everyone else sees nothing (Home's cycle preview is
  opted-in only). Swap the sex check for a backend eligibility flag when one exists.
- **Tab layout**: today card (log start/end) → month calendar (`components/cycle-calendar.tsx`:
  logged period days filled, an ongoing one up to today; the backend's fertile range dashed; tap a
  day for details and "log a period starting this day" / "edit this period") → phase and
  fertile window → infinite history. Cycle settings open from the top bar's settings button and
  the profile sheet. Each month loads its own periods
  (`usePeriodsInMonth`, `fetchPeriodsBetween`); marks come from `periodDays` in
  `packages/api/src/cycle/calendar.ts` (unit tested). Nothing is predicted in the app.
- **Display rules**: the fertile window is only ever a date range (Zod drops `ovulation_start/end`),
  with the backend's `note` shown in full. The current phase isn't returned yet, so the phase card
  shows sample data (`features/cycle/demo.ts`, proposed shape in `packages/api/src/cycle/types.ts`)
  with a Preview badge.
- **Writes** (save/delete period, save settings, turn off) are keyed mutations registered in
  `registerCycleMutations` (`features/cycle/queries.ts`, called from `provider/mutations.ts`), with
  optimistic cache updates. Periods use device-made ids and upsert, so a replay never duplicates.
  Writes that fail for good show a banner with Try again / Discard (`useFailedCycleWrites`).

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
JS-only changes ship to installed APKs over the air; see [mobile-releases.md](mobile-releases.md).

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
  Also bump the `expo` devDependency in `packages/api` to the same version: it pins `jest-expo`'s `expo`
  peer. If it drifts, pnpm nests an older untransformed copy and every test fails with
  "Cannot use import statement outside a module" in `expo/src/winter`.
- **pnpm hoisted linker** (`nodeLinker: hoisted`) is required for Metro.
- **EAS Update fingerprint on Windows:** `patches/@expo__fingerprint@0.20.13.patch` fixes a Windows
  path bug that made the local runtime version differ from EAS's. Without it, EAS builds fail in
  "Configure expo-updates" with "Runtime version mismatch". When Expo bumps `@expo/fingerprint`, check
  whether the fix landed upstream; if not, recreate the patch (`pnpm patch @expo/fingerprint@<ver>`).
  `apps/mobile/.gitignore` must keep `/android` and `/ios` for the same reason.
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
