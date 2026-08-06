# Plan 013 findings: Notification action buttons

Spike against Expo SDK 56 (`expo-notifications@~56.0.18`), Android-first.
Planned at `7cb9bf7`; drift since then: plan 009 `waterPaused` in
`waterScheduler`, plan 010 permission recovery helpers — neither blocks MVP.

## 1. Feasibility

**Partial → shippable with trade-off: GO for water MVP.**

| Capability | Verdict |
|------------|---------|
| Register categories / actions | **Works** — `setNotificationCategoryAsync` on Android + iOS |
| Attach `categoryIdentifier` when scheduling | **Works** (typed; docs tag input as iOS-heavy, but categories API is Android too) |
| Action → JS via `addNotificationResponseReceivedListener` | **Works** when action opens app (`opensAppToForeground: true`, default) |
| Pure background log while killed (`opensAppToForeground: false`) | **Blocked without new deps** — needs `expo-task-manager` + `registerTaskAsync`; not in package.json |
| Eye “complete break” from shade | **Out of scope** (PRD 20s rule) |

Expo types spell it out: if `opensAppToForeground` is `false` and the app is
**killed**, response listeners do **not** run. Headless path is
`TaskManager.defineTask` + `Notifications.registerTaskAsync` (Android action
taps when backgrounded/terminated). Installing `expo-task-manager` is a
STOP-condition expand; we do not take it in this plan.

## 2. Recommended architecture

```
ensureNotificationChannels()
  └─ also ensureNotificationCategories()   // water_actions + LOG_GLASS

rescheduleWaterReminders()
  └─ content.categoryIdentifier = 'water_actions'

App listener
  └─ handleNotificationResponse(response, { navigate, logGlass })
       ├─ action LOG_GLASS + feature water → await logGlassViaRepo(repo)
       │     (no navigate)
       └─ default action → routeNotificationResponse (existing)
```

**Logging without React hooks**

- New pure-ish helper `logGlassViaRepo(repo)`:
  1. `getSettings` + `getLog(todayKey())`
  2. `initialStateFromLog` → `dailyReducer(..., { type: 'LogGlass' })`
  3. `upsertLog` (preserve `eyeBreaks`)
  4. if newly hydrated → `rescheduleWaterReminders({ repo, notifications })`
- Same count rules as `DailyLogProvider.logGlass`; no Undo from shade.
- **No global singleton.** `App` already owns `repo` after bootstrap;
  pass it into `ThemedApp` and close over it in the listener.

**UI freshness**

Repo writes from the action can race an already-mounted `DailyLogProvider`.
MVP reloads today’s log when the app returns to `active` on the same calendar
date (extend existing AppState handler). Cold start after action: listener
runs after providers mount; reload-on-active covers return-to-foreground;
if still racy on first paint, next foreground or home revisit fixes it.

## 3. MVP definition

- Category id: `water_actions` (underscore; Expo forbids `:` and `-` in ids).
- One action: `LOG_GLASS` / button title **Log glass**.
- `opensAppToForeground: true` — opens app, runs JS, logs glass, no modal.
- Water schedules only attach the category; eye unchanged.
- On goal hit, existing reschedule path cancels remaining today’s water
  reminders (and re-queues future days as today).

## 4. Non-goals

- Eye complete-from-notification / any eye action button
- `opensAppToForeground: false` + headless task
- iOS-focused polish / custom notification layouts
- Undo from notification
- Changing fire-time algorithms
- Plan 011 Home UI changes

## 5. Risks

| Risk | Mitigation |
|------|------------|
| Double-log (action + open WaterLog + tap) | Action does not navigate; user must intentionally log again in UI |
| Double delivery of same response | Match existing cold-start pattern (listener only); clear last response only if we later add `getLastNotificationResponse` dual path |
| Stale DailyLog UI after repo write | Reload on AppState `active` same date |
| Categories sticky on device | Changing action ids: `deleteNotificationCategoryAsync` then re-register |
| Permission denied | Buttons only matter if notifications already deliver (plan 010 recovery) |
| Type tag says categoryIdentifier iOS | Still set it; categories API is dual-platform; verify on Android device |
| Killed + opensApp false | Not used; would need task manager |

## 6. Go / no-go

**GO** for MVP with foreground-opening **Log glass** action.

**No-go** only for pure shade-without-opening-app logging until a follow-up
adds `expo-task-manager` and a headless log path.

### Manual checklist (dev-client Android; not CI)

1. Ensure water reminders schedule (enabled, not paused, under goal).
2. Wait for or trigger a water notification.
3. Expand notification → **Log glass** visible.
4. Tap **Log glass** → app opens; Home/Stats/Water show count +1.
5. At goal, further **today** water notifications stop after reschedule.
6. Default body tap still opens Water Log (no auto log).
7. Eye notification has no Log glass / no complete action.

### Category maintenance

If action identifiers change later: call
`Notifications.deleteNotificationCategoryAsync('water_actions')` then
`setNotificationCategoryAsync` again on next launch (or once in a migration
helper). Re-registering alone may leave stale action sets on some OS versions.
