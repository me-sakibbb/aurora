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
  2. In the same Google Cloud project, create an **Android** OAuth client: package `com.mybela.app`
     and the SHA-1 of the EAS keystore (`44:2E:79:…:D6:2B` was the old `com.aurora.app` keystore that
     signed development and preview builds; read from the APK with `apksigner verify --print-certs`;
     Play Store builds are re-signed by Google, so add Play's app-signing SHA-1 later). Nothing from this
     client goes into the app; Google just needs it to exist.
  3. Add the **Web** client ID (`…lck2fi20…`, not the Android `…04qsklbf…`) to EAS, then ship it without a rebuild:
     `eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <id> --environment preview --environment development --environment production --visibility plaintext`
     → `pnpm update:preview`. Also uncomment it in `.env.local` for local dev.

## Rebrand to MyBela (2026-11-02)

The app was renamed from Aurora (now only the codename: EAS slug, local storage keys, backend repo).
The app ID changed from `com.aurora.app` to `com.mybela.app` and the deep-link scheme from `aurora://`
to `mybela://`, so the next APK is a **new app**: testers uninstall the old Aurora APK and install the
MyBela one, and it only receives updates once rebuilt.

- [ ] Supabase → Authentication → URL Configuration: add `mybela://auth/callback` to Redirect URLs
      (keep `aurora://…` until no old APKs are in use). Without it, password-reset and confirmation
      emails can't open the app.
- [ ] First build for the new ID: run `pnpm build:apk` **interactively** (EAS has no keystore for
      `com.mybela.app` yet and won't generate one in `--non-interactive` mode). Then get the new SHA-1
      with `eas credentials -p android`.
- [ ] Google Cloud: create a new **Android** OAuth client for `com.mybela.app` with that SHA-1 (step 2
      below). The old one is tied to `com.aurora.app`; until this exists, Google sign-in fails with
      `DEVELOPER_ERROR` (code 10).

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

## iOS (additional work A1, set up 2026-11-02)

The shared code and `app.config.ts` are iOS-ready; nothing has been built yet. EAS builds iOS in the
cloud on macOS, so no Mac is needed (Windows can't run `expo prebuild --platform ios` locally).
Testers install through **TestFlight**; there is no iOS equivalent of the APK link.

**Blocked on the client:**

- [ ] **Apple Developer Program** membership ($99/year), enrolled by the client so they own the
      App Store listing (organisation enrolment needs a D-U-N-S number and can take a week or two). They
      add the developer as an **App Manager** in App Store Connect → Users and Access.
- [ ] Confirm the final bundle ID (`com.mybela.app`, same TODO as the Android package). It can't
      change after the first upload.

**Then:**

1. Google Cloud (same project as Android): create an **iOS** OAuth client with bundle ID
   `com.mybela.app`. Add its client ID to EAS for every environment:
   `eas env:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value <id> --environment preview --environment development --environment production --visibility plaintext`
   Also add it to Supabase → Auth → Google → *Client IDs* (comma-separated, next to the web one).
   Setting this variable adds the Google URL scheme to `app.config.ts`, which **changes the native
   fingerprint on Android too**: rebuild the APK (`pnpm build:apk`) before the next Android OTA update.
2. Fill in the missing **production** EAS env vars (see the list at the top). TestFlight builds use the
   `production` profile and channel.
3. `pnpm build:ios`. The first run signs in to Apple and lets EAS create the distribution
   certificate, provisioning profile and **APNs push key**. Expo Push uses that key, so iOS push needs
   no backend change as long as the backend sends through Expo Push.
4. `pnpm submit:ios` uploads the latest build to App Store Connect. Add testers in TestFlight; the
   first external-tester build goes through a short Beta App Review.
5. JS-only changes reach TestFlight installs with `pnpm update:production:ios`.

**Test on a real iPhone before release:** Google sign-in, Face ID app lock, notification permission
prompt, keyboard over the onboarding and auth forms, safe areas on notched phones, and Bengali text
rendering.

Optional: `pnpm build:ios:adhoc` builds an internal (ad hoc) install link like the APK, but every
iPhone's UDID must be registered first (`eas device:create`) and the build redone for each new device.
