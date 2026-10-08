# Mobile builds and OTA updates

All commands run in `apps/mobile`.

## Next steps (set up 2026-10-04)

- [x] Rebuild the preview APK once so it includes `expo-updates`: `pnpm build:apk`. APKs built
      before this can't receive OTA updates.
- [ ] Add `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the
      **production** EAS environment before the first release build. Production currently only has
      `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- [x] **Google sign-in** working on the preview APK (2026-10-04). Setup, for reference (error code 10 `DEVELOPER_ERROR` in `adb logcat` = one of these is wrong):
  1. Google Cloud → APIs & Services → Credentials: create a **Web application** OAuth client. Put its
     client ID and secret in Supabase → Authentication → Providers → Google (enable it).
  2. In the same Google Cloud project, create an **Android** OAuth client: package `com.aurora.app`
     and SHA-1 `44:2E:79:44:62:B7:76:01:2B:5B:B2:8D:43:3C:90:B3:BA:54:D6:2B` (the EAS keystore that
     signs development and preview builds; read from the APK with `apksigner verify --print-certs`;
     Play Store builds are re-signed by Google, so add Play's app-signing SHA-1 later). Nothing from this
     client goes into the app; Google just needs it to exist.
  3. Add the **Web** client ID (`…lck2fi20…`, not the Android `…04qsklbf…`) to EAS, then ship it without a rebuild:
     `eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <id> --environment preview --environment development --environment production --visibility plaintext`
     → `pnpm update:preview`. Also uncomment it in `.env.local` for local dev.

## Which command do I need?

| Change                                                        | Command                    |
| ------------------------------------------------------------- | -------------------------- |
| Day-to-day development                                        | `pnpm start` (dev client, hot reload, no build) |
| JS/UI/text change for testers                                 | `pnpm update:preview`      |
| JS/UI/text change for production users                        | `pnpm update:production`   |
| Native package added/upgraded, config plugin, permission, Expo SDK upgrade | `pnpm build:apk` (preview) / `pnpm build:apk:dev` (dev client) |

- **Updates** take about a minute and need no reinstall. The app downloads the update in the
  background on one launch and applies it on the next.
- **Fresh installs** start on the code built into the APK, then catch up: the first launch downloads
  the latest update and the second runs it. Installed copies apply later updates straight away
  (`update-overlay.native.tsx` shows "Downloading an update…" and restarts). Before sharing the APK
  link with new testers after several updates, rebuild it (`pnpm build:apk`) so they start current.
- **Builds** run on EAS. The free tier can queue for a while before the 10–20 minute build itself.

## How it fits together

- **Channels:** each `eas.json` build profile has a channel of the same name. An APK only receives
  updates published to its own channel.
- **Runtime version** uses the `fingerprint` policy. When native code changes, the fingerprint changes
  and older APKs stop receiving new updates rather than crashing on them. If an update doesn't reach
  a device, check that its runtime version matches the installed build; if not, rebuild.
- **Environment variables:** `EXPO_PUBLIC_*` values are inlined into the JS bundle. Builds and updates read
  them from the EAS environment (`eas env:list --environment preview`), **not** from `.env.local`,
  which is git-ignored and never uploaded. Only local `expo start` / `expo export` use `.env.local`.
  To add one: `eas env:create --name NAME --value VALUE --environment preview --visibility plaintext`,
  then publish an update or rebuild.
