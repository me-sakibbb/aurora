# MyBela feature tracker

Tracks front-end progress against the main quotation (`docs/client/Aurora_FrontEnd_Quotation.pdf`,
F1–F26 and P1–P10) and against extra work billed separately
(`docs/client/Aurora_Additional_Work_Quotation.html`, A-items). Prices stay in those git-ignored files,
not here.

**Last updated:** 2026-11-20 (after commit `ad77f6a`, Phase 5)

## How to use this file

- `[x]` means the front-end work is complete on web and Android and needs nothing more from us.
- `[ ]` means the work is open. The note under it says what is missing and who it is waiting on.
- **Waiting on BE** means our side is built but the backend endpoint or field it needs doesn't exist yet.
  Those screens show demo data marked with a "Preview" badge, or a disabled control.
- When a feature ships, tick it, update its note, and bump the date above.
- Anything that is *not* in the main quotation goes in [Extra work](#extra-work-outside-the-main-quotation)
  and also as a new A-item in the additional-work quotation.

## Summary

| Phase | Window | Status |
| --- | --- | --- |
| 1: Access, onboarding & settings | Sep 21 – Sep 29 | F1, F2, F3 done |
| 2: Home, food logging & recipes | Sep 30 – Oct 20 | F5, F6 done · F4 mostly live (streak, chips, noticed demo) · F7, F8, F9 open |
| 3: Cycle tracking | Oct 21 – Nov 3 | Built · symptoms halted · waiting on BE flags |
| 4: Mood, analytics, system states | Nov 4 – Nov 10 | F12, F15 done · F14 waiting on Clarity ID |
| 5: Chat, patterns, suggestions | Nov 11 – Nov 24 | Built · F17 live · chat safety/sources waiting on BE |
| 6: Engagement & trust | Nov 25 – Dec 5 | Not started (some demo UI on Home) |
| 7: Localization, profile, privacy | Dec 6 – Dec 12 | F24 partly done · F25 partly done |
| 8: Phase 2 feature set | Dec 13 – Dec 24 | Not started |
| QA + closed beta | Dec 25 – Dec 31 | — |

---

## Phase 1: Access, onboarding & settings

- [x] **F1 Allowlisted sign-up & login**
  - Email + password and Google (native account picker on Android, redirect on web), forgot/reset
    password, and auth callback.
  - Not-approved users see a friendly waitlist / pending-approval screen, separate from wrong-password
    errors. There is also a front-end waitlist guard.
  - Routing after login sends new users to onboarding and returning users to Home.
- [x] **F2 Onboarding flow**
  - Built as a longer, client-approved flow, not 4 screens: welcome → heard-from → goals (multi-select)
    → diet → kitchen (cooking style + oil) → sample meals → sign-up → body questions → review →
    notifications → widget. It includes milestone celebration screens.
  - Answers are kept on the device and survive restarts (`draft-store.ts`), then are submitted after sign-up.
  - The client removed the cycle questions (2026-10-09).
  - Note: the widget step only records opt-in. No home-screen widget is built.
  - **BE regression, fixed (2026-11-20):** backend commit `c2d30ef` ("Custom recipes") made
    `GET /food/recipes` require auth, which broke the signed-out sample-meals step. Backend `4e13cc5`
    made it optional-auth again. Checked live: a signed-out request returns 200 with the catalog.
- [x] **F3 Health & goals settings**
  - `/settings` screen (profile sheet → "Health & goals"), pre-filled from `GET /profile`: goals, diet,
    sex, age, height and weight (cm/ft-in, kg/lb), body type, activity, blood pressure, diabetes.
  - Saves only the changed fields with `PATCH /profile` (2026-11-20) and shows the new daily target
    as returned. Then it refreshes the Today card, week insights and suggestions.
  - States: loading, error, offline (save disabled, online only on purpose so the new target can be
    shown), no-profile, save error.
  - Not in the form: notifications (that's the OS permission, F20+), BMI (returned but not shown).
  - Waiting on BE: a way to write `discreet_mode` and `wants_fertility_estimate` through the API.

## Phase 2: Home, food logging & recipes

- [ ] **F4 Home dashboard**
  - Built: layout, skeleton loading, quick jumps to log food / mood / chat, and the cycle preview
    shown only when relevant.
  - Live: the Today card (`GET /dashboard`), profile, cycle status, meal suggestions, today's logs
    (read straight from `food_logs` in Supabase), and the week card's logged-day dots plus totals
    (days logged, average per logged day, days within target) from `GET /calories/insights`.
  - Demo ("Preview", badged per item): the streak count (card + header pill), Flex Day chips, and the
    Aurora Noticed card.
  - The week card also shows the backend's written `observation` from `/calories/insights`
    (2026-11-20) as the insights summary.
  - Waiting on BE: a streak count and noticed. The DB has no table for either. The observation
    is English only. Nice to have on `/calories/insights`: an `entries` count per day (we count a day as
    logged when `consumed_kcal > 0` or `unquantified_entries > 0`, so a logged 0 kcal item is missed).
- [x] **F5 Food search**
  - Hybrid search (instant on-device match plus backend `?search=`), a card grid with photos, and
    infinite scroll.
  - The "flag a missing food" sheet is built, but submit is disabled ("Coming soon").
  - Waiting on BE: `POST /food/missing`, Bengali/Banglish matching, and the `kcal_min`/`kcal_max`
    range. We show `kcal_per_100g` until the range exists; the range UI is already wired.
  - Check: Bengali names are shown next to English on results.
- [x] **F6 Add food & adjust portion**
  - The log form opens in the food detail sheet. It has a meal picker, portion, oil (less/usual/more),
    and recipe questions, with a live estimate from `POST …/nutrition`.
  - Offline-safe: uses a keyed mutation, so the log is replayed when the connection returns.
  - Waiting on BE: a log idempotency key (an offline replay could duplicate a log), and applying the oil
    tier to nutrition. No recipe has questions yet, so that UI hasn't been tested against live data.
- [ ] **F7 Daily summary & date picker**
  - Not started.
  - Blocked by BE: there is no GET for food logs.
  - To do: a day view grouped by meal, date navigation, an empty state, and infinite paging.
- [ ] **F8 Recipe library (~33 dishes)**
  - Partly done: the Food tab can be browsed (category rail, card grid, detail sheet with a big photo),
    and it uses the same search and log flow.
  - To do: decide whether the browsable Food tab counts as the library or needs its own "Recipes"
    section. Confirm with the client. The BE needs to fill in the dish data (~33).
- [ ] **F9 Plate reveal animation**
  - Not started. It plugs in after a log is saved (`LogSaved` in `log-panel.tsx`).
  - Front-end only.

## Phase 3: Cycle tracking & fertile window

- [ ] **F10 Cycle tab (period tracking)**
  - Built: setup flow (start + end range), start/end period, phase view (`POST /cycle/phase`), and a
    history list with a real delete. Cycle data goes to Supabase directly (`cycle_logs`).
  - Missing: **daily symptom logging, halted by the client's decision.** Flow values aren't defined
    either. Resume only when told.
  - Waiting on BE: cycle-log endpoints (we write to Supabase directly for now); Bengali phase text.
- [x] **F11 Fertile window display**
  - Shows a range only, with an opt-in yes/no (`profiles.wants_fertility_estimate`). Hidden when the
    user hasn't opted in.
  - Waiting on BE: an explanatory `note`/reason field (the "show note in full" requirement can't be met
    until it exists); a way to set the opt-in through the API; and phase copy that respects the opt-in.
- [x] **F13 Cycle tab visibility rules**
  - The tab and its entry points show or hide based on opt-in plus profile `sex` (temporary rule).
  - Waiting on BE: a real `eligible` flag to replace the `sex` rule.

## Phase 4: Mood logging, analytics & system states

- [x] **F12 Mood logging**
  - A stepped check-in: mood → energy → sleep → stress → tags + note. "Save now" appears after mood.
  - Upserts once per day. The Mood screen has today, a month calendar, and an infinite history.
    Past days can be edited.
  - Waiting on BE (nice to have): cursor paging and a delete endpoint.
- [ ] **F14 Usage analytics (Microsoft Clarity)**
  - Wired on web (`apps/web/app/layout.tsx`) and Android (`@microsoft/react-native-clarity`, with
    screen names). It records everything, by the user's decision.
  - Blocked: there is no Clarity project ID from the backend yet, so capture can't be confirmed. Set
    `EXPO_PUBLIC_CLARITY_PROJECT_ID` and the web env var, then verify.
- [x] **F15 Loading / empty / error / offline states**
  - Connection-status strip, error boundary, and 404 page. Every data screen has loading, empty, and
    error states.
  - "Must not lose it" writes use keyed mutations via `setMutationDefaults`.
  - Keep doing: every new screen in Phases 6–8 needs the same four states.

## Phase 5: Chat, patterns & suggestions

- [ ] **F16 "Ask Aurora" chat**
  - Built: send message, typing indicator, slow / very-slow waiting lines, markdown replies, Bengali
    font and spacing adjustment, history from Supabase (resumes the latest thread), and "New chat".
  - Missing, by the user's decision until the BE sends the signals:
    - a calmer look for sensitive/redirected topics, with an "why" explanation
    - a stop-conversation state (no reply box)
    - sources/citations display
  - Waiting on BE: `status` / safety / stop signal in `ChatResponse`, `citations`, 429 + timeout
    handling, and the topic classifier.
- [ ] **F17 Mood pattern insights**
  - Live (2026-11-20): `MoodInsightCard` on the Mood screen and Home shows the backend's
    `observation` from `GET /mood/insights` (last 30 local days), exactly as written. No check-ins in
    the range → the quieter "not enough yet" style, still with the backend's wording.
  - Loading, error and offline states. It refreshes after a check-in is saved.
  - Waiting on BE: Bengali observations (the sentence is English only, no language parameter).
- [x] **F18 Goal-based food suggestions**
  - Each suggestion shows its explanation, a "tried" marker, a static note as a fallback, and a "New
    ideas" refresh. A 422 shows the "getting ready" empty state. The detail sheet has "Log this meal".
  - Waiting on BE: a specific reason per item (it's generic now), the `tried` and note fields, kcal on
    cached responses, and the UTC "consumed today" window.

## Phase 6: Engagement & trust components

- [ ] **F19 "Flex day" chips**
  - Only a demo count on Home. To do: the chip balance and the "use a chip to protect a day" action.
  - Needs from BE: the chip balance and a use-chip endpoint.
- [ ] **F20 "Aurora noticed" card**
  - The card exists on Home with demo data. To do: wire it to the real endpoint.
  - Needs from BE: a noticed-observation endpoint.
- [ ] **F20+ Recurring notification delivery**
  - Partly done: the permission request is in onboarding and `lib/notifications(.native).ts` exists.
  - To do: register the push token, show incoming notifications, open the right screen on tap, and
    handle insight reminders and admin broadcasts through one path. Web Push is not started.
  - Needs from BE: a token registration endpoint and FCM/VAPID keys.
- [ ] **F21 Disclaimer & citation components**
  - Not started. To do: shared components that always show the current wording in full.
  - Needs from BE: an endpoint for the admin-editable wording.
- [ ] **F22 Logging streak display**
  - The week strip's logged days are live (`GET /calories/insights`). The streak count is still demo.
  - Needs from BE: a streak endpoint.

## Phase 7: Localization, profile & privacy

- [ ] **F23 Bengali / Banglish input support**
  - Groundwork is done: i18next with en/bn files, a language toggle, Bengali chat typography, and inputs
    that don't autocorrect.
  - To do: real Bengali translations (`bn.json` still has English placeholders in places), check layouts
    with longer Bengali text, and confirm the Bengali font (Noto Sans Bengali is a placeholder).
- [ ] **F24 Profile modal**
  - Partly done: the profile sheet shows the name, calorie target, cycle settings, language, and sign out.
  - To do: wire the "Settings" row (F3); add more shortcuts as features land (badges P7, my recipes P8,
    notifications P9, support directory F26).
- [ ] **F25 Discreet mode**
  - Partly done: Home covers the cycle and mood cards (`Veil`) when `profile.discreet_mode` is on.
  - To do: a toggle in settings; hide the same content from app previews/notifications; build the extra
    lock screen with honest copy about its limits.
  - Waiting on BE: a way to write `discreet_mode` (it is duplicated in profiles + ovulation_profiles, and
    `POST /ovulation` resets it).
- [ ] **F26 Support services directory**
  - Not started. To do: a read-only list with tap-to-call numbers and opening hours.
  - Needs from BE: a directory endpoint managed from the admin panel.

## Phase 8: Phase 2 feature set

- [ ] **P1 Insights reports**: not started. The Insights tab is a "Coming soon" placeholder. Needs a BE
  report endpoint.
- [ ] **P2 Explore content library**: not started. Hands off into a pre-started chat; `/chat?q=` already
  supports this.
- [ ] **P3 Full Bengali UI pass + QA**: not started. Depends on F23 translations.
- [ ] **P4 Chat history / threads**: partly done. History is stored in and read from Supabase, and the
  chat resumes the latest thread. To do: a thread list (infinite) to reopen and continue any thread.
- [ ] **P5 FAQ screen**: not started. Needs content from BE.
- [ ] **P6 "Common concerns" chips**: not started. Uses the same hand-off as P2. Avoid stacked pill
  rows (UI feedback).
- [ ] **P7 Aura badges**: not started. Needs badge data from BE.
- [ ] **P8 My recipes**: not started. P8 is save/unsave favourites from the library and still needs
  save/unsave + list endpoints. Creating your own recipes is a separate extra item, A2 (below).
- [ ] **P9 Notifications (in-app centre + SMS opt-in)**: not started. Needs BE endpoints.
- [ ] **P10 Native app lock**: not started. PIN / biometric lock (expo-local-authentication), Android
  only (iOS via A1).

## Release & QA

- [ ] Cross-platform QA pass (web + Android)
- [ ] Closed beta with allowlisted users
- [ ] Final app ID confirmed by the client (`com.mybela.app`) before the first Play Store upload
- [ ] Final handover

---

## Extra work outside the main quotation

Each item here must also be added as an A-item in `docs/client/Aurora_Additional_Work_Quotation.html`
(then re-render the PDF). The "Quoted" box means it is in that document. "Priced" means the client
has a price for it.

| ID | Feature | Status | Quoted | Priced | Notes |
| --- | --- | --- | --- | --- | --- |
| A1 | iOS app (iPhone) | In progress | [x] | [ ] | Rebrand prepared the iOS build; iOS Google client recorded. Needs an Apple Developer account from Aurora, TestFlight setup, and Face ID lock (with P10). |
| A2 | Custom recipes (create, reuse, edit, delete, log) | Built | [x] | [ ] | See "A2 custom recipes" below. |

### A2 custom recipes (built 2026-11-20)

- [x] Food tab: a small "+ New recipe" pill beside the "All dishes" heading, and a "My recipes" rail
  (recipe tiles + "See all", shown only once there's at least one recipe) and `/food/my-recipes` (infinite
  card grid with loading / empty / error / offline states). Own recipes show a "My recipe" marker in
  search and on cards.
- [x] 4-step editor at `/food/recipe` (new) and `/food/recipe?id=` (edit): photo + names + cooking type →
  ingredients → finished weight + servings → review. Ingredients: the recipe's list on top (tap to
  change the amount), then every ingredient A–Z (`GET /food/ingredients?limit=200`, paged on the device,
  infinite) or the matches for what's typed. Picking one opens a "How much?" sheet (grams with −/+).
  Rows have a photo tile (icon until the backend sends ingredient photos).
  The draft is kept on the device until saved (cleared on sign-out).
- [x] Save uses `POST /food/recipes/custom` or `PATCH /food/recipes/{id}`. `yield_factor` is the
  finished weight the person entered ÷ the raw total. Backend `detail` errors (e.g. the water rule) are
  shown as returned. After saving, the backend's nutrition per 100 g is shown with "Log it now" (the
  F6 log form).
- [x] Errors (2026-11-20): the ingredients step says up front when a water-cooked method (dal, jhol,
  curry, torkari, polao/biryani) has no "Water (Added)", with an "Add water" button, and Next is
  blocked until it's added. **This mirrors a backend rule in the client, at the user's request**
  (`packages/api/src/food/recipe-rules.ts`, copied from food.py `WATER_REQUIRED_METHODS`). Save
  re-checks every step first. Backend errors are sorted (`classifyRecipeError`) and shown on the step
  that fixes them (water, missing or duplicate ingredient, weight) or above Save (offline, signed out,
  not found, server). Unknown 4xx messages are shown as returned.
- [x] Detail sheet: Edit and Delete for own recipes. Delete shows a 409 ("in your food log") plainly.
- [x] Photo: camera or gallery (expo-image-picker on Android, file input on web). Before upload it's
  resized to ≤ 1280 px and re-encoded as JPEG q0.7, with a second pass at 1024 px / q0.55 if it's still
  > 1 MB (expo-image-manipulator on Android, canvas on web). Upload goes through `POST /uploads/file`
  (backend `24fdcc8`) and the returned URL is sent as `thumbnail_url`.
- Waiting on BE:
  - **Recipe photo bucket: created on the FE side (2026-11-20, user's OK).** Uploads failed because no
    `recipe-photos` bucket existed. Migration `recipe_photos_bucket` (public, 5 MB, JPEG/PNG/WebP) is
    saved in `docs/sql/recipe_photos_bucket.sql`. The backend should adopt it into its migrations.
  - Ingredient photos: `image_url` on `bfct_foods` (also in the ingredients list and recipe detail). The
    app already reads it.
  - `/uploads/file` accepts any `bucket_name` (including the private meal-images bucket) and any file
    type. Proposed: an allowed-bucket list, and an image type + signature check.
  - No way to delete a replaced or never-saved photo.
  - `yield_factor` optional with a per-method default, so the finished-weight step can become optional.
  - A nutrition preview before saving (today it's only known after Save).
  - `GET /food/recipes?mine=true&offset=` (My recipes filters the first 200 catalogue rows today).
  - `GET /food/ingredients`: `offset`, and matching on Bengali names/aliases (English `name_en` only).
  - Publish the recipe rules (e.g. `requires_water` per cooking method), so the app's copy can go.
  - Stable error codes next to the English `detail`, so errors can be shown in Bengali.
  - `thumbnail_url` saved as the placehold.co image when there's no photo (should be `null`).
- Native deps added: `expo-image-picker`, `expo-image-manipulator`. **Rebuild the dev client / APK.**

### Built beyond the quotation's wording (not quoted separately)

These went further than the quotation describes, at the user's or client's request. They aren't
billed separately for now. Review them before the next quote update, in case any should become an
A-item.

- [x] **Rename to MyBela** (2026-11-02): UI text, app ID, scheme, packages.
- [x] **Expanded onboarding** (F2): ~15 steps instead of 4, plus milestone celebration screens with
  confetti and haptics.
- [x] **Over-the-air updates** for the APK, with an update overlay (`features/updates`).
- [x] **Phone-first frame on desktop web**: the whole app sits in a 480px frame on large screens.
- [x] **Mood visuals**: separate visuals for energy (batteries), sleep (moon phases), and stress
  (weather), plus a month calendar of mood faces.
- [x] **Food photos**: card grid with `expo-image` and a big hero photo in the detail sheet.
- [x] **Cycle calendar**: period range marking in setup.
- [x] **Waitlist UI and front-end guard** for users outside the allowlist (goes beyond F1's message).
