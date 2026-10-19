# Submission checklist: Spatial Lab

Rules: [COMPETITION.md](COMPETITION.md). Meta doc paths below open with `metavr docs fetch "<path>"` or under https://developers.meta.com/vr/.

**Deadline: 2026-11-18 12:00 PT** (entry period ends; no changes after that, until the winner announcement on about 2026-12-11).

## The two delivery paths

| Path | Status | What judges open |
|---|---|---|
| **A. Hosted link (primary)** | Required for IWSDK entries: "For apps built with IWSDK (WebXR): A link will be required" (§4 Submission) | `https://clrke.github.io/spatial-lab-webxr/` in Quest Browser |
| B. PWA APK in a "Competition" release channel | Optional backup, and a step toward a Store launch | Release-channel invite URL; installs like any app |

Do A. Add B only if there is time after the feature freeze. B must point at the same frozen build.

## A. Hosted link (GitHub Pages)

Source: `documentation/iwsdk/guides/08-build-deploy.md` ("Deploying to GitHub Pages", Option B: GitHub Actions); `documentation/web/web-hosting.md` (check that the URL returns 200 without login).

- [ ] Pages source is "GitHub Actions"; `.github/workflows/deploy.yml` builds `dist/` on each push to `main`.
- [ ] `curl -sI https://clrke.github.io/spatial-lab-webxr/` returns `200`, with no login, paywall or account.
- [ ] On a Quest 3 and a 3S: open the URL, **Enter VR**, and finish every module with hands only (controllers off). No console errors (`metavr log` or Quest Browser remote DevTools via MQDH: `documentation/web/browser-mqdh`).
- [ ] Cold start under about 10 s on headset Wi-Fi. Check the `dist/` size (IWSDK emits 17 lazy font chunks; they do not slow startup. `iwsdkDev({ bundle: { fonts } })` only works once an `iwsdk.config.json` exists, and that file then also drops Havok from builds unless it declares `world.features.physics`).
- [ ] At least 60 fps everywhere, 72 fps the goal (`documentation/web/webxr-perf`; OVR Metrics Tool).
- [ ] Freeze: tag `v1.0.0` on the submitted commit. Do not push to `main` from the deadline until the winners are announced (a push redeploys). Put work after the deadline on a branch.
- [ ] Backup host (optional): the same `dist/` on Vercel (`documentation/web/web-hosting`), in case of a Pages outage. Put only one URL on Devpost; keep the backup ready to share if support asks.

## B. Optional: PWA APK in the "Competition" release channel

Sources: `documentation/web/pwa-overview.md`, `documentation/web/pwa-overview-gs.md` (manifest and icons), `documentation/web/pwa-packaging.md` (Bubblewrap, verified with `@meta-quest/bubblewrap-cli` 1.24.1), `resources/publish-create-app.md`, `resources/publish-release-channels.md`, `resources/publish-release-channels-add-users.md`, `resources/age-groups.md`, `resources/publish-upload-overview.md`.

1. **Web app manifest and icons:** add `public/manifest.webmanifest` (name, `start_url`, `scope`, `display: standalone`) and 192/512 px icons, including a maskable one, and link it from `index.html`.
2. **Auto-enter VR:** an installed immersive PWA has no 2D page, so it must start the session itself. Already in `js/main.js` (`isInstalledPwa()`): it auto-launches when `display-mode` is standalone/fullscreen or the URL has `?pwa=1`, so set the manifest `start_url` to `./?pwa=1`. Do not use `getDigitalGoodsService` as the check: Quest Browser 154 exposes it in normal tabs, and a launch without a tap fails there ("requires user activation"; seen on a Quest 3S, 2026-10-20).
3. **Create the app:** Developer Dashboard > Create app (Meta Horizon Store) > note the App ID.
4. **Package:**
   ```bash
   npm install --global @meta-quest/bubblewrap-cli   # Node 18+
   bubblewrap init --manifest=https://<origin>/manifest.webmanifest --metaquest
   #   App mode: immersive  (twa-manifest.json -> "horizonOSAppMode": "immersive")
   #   Package id: fixed forever (for example io.github.clrke.spatiallab)
   #   Horizon Billing: no (free app)
   bubblewrap build                                     # -> app-release-signed.apk
   ```
   `bubblewrap init` is interactive (it needs a TTY). Keep the keystore and passwords out of git (`.gitignore`) and back them up: every update needs the same key.
5. **Digital Asset Links:** `bubblewrap fingerprint add <SHA-256>` writes `assetlinks.json`. Serve it at `https://<origin>/.well-known/assetlinks.json`. "An immersive PWA does not launch if this verification fails."
   - **GitHub Pages catch:** `/.well-known/` must be at the origin root (`https://clrke.github.io/.well-known/...`). A project site cannot serve it. Use the `clrke/clrke.github.io` user-site repo, a custom domain, or Vercel.
6. **Sideload test:** `adb install app-release-signed.apk`, then launch from Unknown Sources. Look for `TWA verification was unsuccessful!` in the logs.
7. **Release channel:** Distribution > Release Channels > new channel named exactly **`Competition`**, **Private** (channel names are permanent).
8. **Upload:** `ovr-platform-util upload-quest-build --app-id <ID> --app-secret <SECRET> --apk app-release-signed.apk --channel Competition --age-group <AGE_GROUP>` (`metavr tools install platform-utils`). An org admin must sign the Developer Distribution Agreement first.
9. **Age group:** required for every upload (`TEENS_AND_ADULTS | MIXED_AGES | CHILDREN`). For a learning app, `TEENS_AND_ADULTS` is the simplest. `MIXED_AGES` or `CHILDREN` brings Meta's extra under-13 requirements (`resources/age-groups.md`): decide before the first upload.
10. **Invite judges:** Channel Settings > "Grant access to users by URL" > Automatic approval. Copy the invite URL. Private-channel invitees must be 18+; 200 users by default, up to 2,500. The invite URL "will be disabled 90 days after your latest build upload". Uploading in November keeps it alive past December 11.
11. **Privacy policy URL:** the dashboard asks for one. Host a short `privacy.html` on the same site. Content: no account, no personal data, progress kept in local storage on the headset, hand-tracking data used live on the device and never stored or sent, no analytics or ads.

## Video (under 3:00)

- [ ] Real footage on Quest (`metavr` screen recording or the headset's built-in capture). Judging: "show real gameplay that honestly represents the experience". No AI-generated video.
- [ ] 0:00-0:15: the hook. A hand pinches the unit-circle point and the sine wave draws itself.
- [ ] 0:15-2:15: one beat per module (trig, geometry, physics). Show the hands, a seated user, and the live numbers.
- [ ] 2:15-2:45: onboarding, accessibility (one-hand mode, high contrast), progress and the daily challenge.
- [ ] End card: the name and the URL "Open in Quest Browser". English captions throughout.
- [ ] Upload to YouTube or Vimeo as **Public**. Check that it plays logged out. Check the length is under 3:00.

## Devpost form fields

| Field | Draft guidance |
|---|---|
| Submission name | Spatial Lab |
| Tagline (140 characters) | "Grab the math: pinch a unit circle, stretch a triangle, throw a ball, and watch trig, geometry and physics update live. Hands only." (131 characters) |
| Track | Productivity (or Gaming if built as puzzles; see COMPETITION.md) |
| Division | New Experience |
| Project link | The GitHub Pages URL (plus the Competition channel invite URL if path B is done) |
| Video | The public YouTube or Vimeo link |
| Description (about 500 words) | Inspiration; what it does (three modules); how it was built (IWSDK, three.js, Havok, hand tracking); challenges (pinch reliability, throw velocity, 72 fps text); accessibility; what's next; **target launch date** (required if not published) |
| Hand interactions (optional) | Pinch-grab, poke, two-hand scale, gaze plus pinch for menus; how false pinches are filtered |
| Team | Name, email and role per member, if any |
| Images | 8-12 headset screenshots, each captioned with what the hands are doing |
| Third-party content | List each library and asset with its licence (IWSDK and three.js are MIT; fonts are OFL) |

## Timeline (today 2026-10-20)

| Dates | Milestone |
|---|---|
| Oct 20-26 | Interaction core (grab, poke, menu) and Module 1 (unit circle), tested on the headset |
| Oct 27 - Nov 2 | Module 2 (geometry) and the first-five-minutes onboarding |
| Nov 3-9 | Module 3 (physics with Havok), progress saving, daily challenge |
| Nov 10-12 | Performance pass (72 fps), accessibility options, two outside playtesters seated |
| **Nov 13** | **Feature freeze** (about 5 days out): bug fixes only from here; tag `v1.0.0-rc` |
| Nov 13-15 | Record the video and screenshots; write the Devpost text; optional path B |
| Nov 16 | Submit on Devpost (editable until the deadline); final headset check of the live URL |
| Nov 17 | Buffer. Tag `v1.0.0` on the deployed commit |
| **Nov 18 12:00 PT** | Entry period ends. Hands off `main` until about Dec 11 |
