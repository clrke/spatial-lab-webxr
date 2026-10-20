# Spatial Lab

**Grab the math.** A hands-first WebXR learning lab for trigonometry, geometry and physics. Pinch a point on a unit circle and watch sin, cos and tan change; stretch a triangle and see its angles still add to 180°; throw a ball and see its path, velocity and forces drawn in the air.

- **Live:** https://clrke.github.io/spatial-lab-webxr/ (open in Meta Quest Browser)
- **Status:** Module 1 has two playable lessons. (1) The unit circle: pinch the point, drag it round, watch sin/cos/tan and the sine wave draw itself, then five challenges. (2) Match the curve: turn two desk dials (amplitude, frequency) until your wave lies on a ghost wave, four rounds. Reset and Next poke buttons sit on the desk. Geometry and Physics are not built yet.

## Target

| | |
|---|---|
| Device | Meta Quest 3 / 3S (judging hardware). Quest 2/Pro may work but are not a target. |
| Runtime | Quest Browser, WebXR `immersive-vr` |
| Input | Hands only (pinch, poke, two-hand scale). No controllers required. |
| Posture | Seated, within about a 2 ft (60 cm) reach |
| Session | 5-10 minute lessons that each end with a payoff |
| Frame rate | 72 Hz target, never below 60 fps |

## Learning modules (planned)

| Module | Core idea | Example interactions |
|---|---|---|
| Trigonometry | The unit circle as a physical object | Drag the point around the circle and read sin/cos/tan live; pull the angle arm and see radians as arc length; match a target wave by turning the circle |
| Geometry | Laws that hold however you deform the shape | Stretch a triangle's corners (angle sum stays 180°); scale a square with two hands (area grows with the square of the side); build a right triangle and check Pythagoras with area tiles |
| Physics | Forces and motion at real scale | Throw or drop a ball and see its trajectory, velocity and gravity vectors; launch at different angles to hit a target; slide blocks on a ramp and read friction and normal forces |

Details: [DESIGN.md](DESIGN.md).

## Tech

**Meta's Immersive Web SDK (IWSDK) 1.0.1**, which runs on three.js (r181, `super-three`) with Vite.

Why IWSDK rather than plain three.js:

| Reason | Evidence |
|---|---|
| The competition gives IWSDK entries a hosted-link path: no APK needed | Official Rules §4 Submission: "For apps built with IWSDK (WebXR): A link will be required for judges to access and test your application." A plain three.js app could be read as "another engine", which needs an APK in a "Competition" release channel. |
| Hand grabbing is built in | `OneHandGrabbable`, `TwoHandsGrabbable`, `DistanceGrabbable`, and `features.grabbing.useHandPinchForGrab` (IWSDK guide "Built-in Interactions", iwsdk.dev/guides/06-built-in-interactions) |
| Physics is built in (Havok, in a worker) | `features.physics` in `World.create` options; needed for the physics module |
| Spatial UI, poke and ray targets, gaze | `PanelUI`/UIKitML, `PokeInteractable`, `RayInteractable`, `xr.features.gazeTracking` |
| Desktop emulator and HTTPS dev server | `@iwsdk/vite-plugin-dev` (IWER emulator, self-signed HTTPS) |
| Still three.js underneath | Any three.js mesh, material or helper works (`world.createTransformEntity(mesh)`) |

The cost: a build step (Vite) and Node.js 20.19+ (`.nvmrc`: 22.12.0). Sources: Meta docs `documentation/iwsdk/guides/08-build-deploy.md` (via `metavr docs fetch`), the IWSDK starter template (`npm create @iwsdk@latest`).

## Run locally

```bash
nvm use            # Node 22 (needs >= 20.19)
npm install --include=dev
npm run dev        # https://localhost:8081 and https://<your-LAN-IP>:8081
```

| Where | How |
|---|---|
| Desktop browser | Open `https://localhost:8081`, accept the self-signed certificate. The IWSDK emulator injects a virtual Quest 3, so **Enter VR** works on desktop. |
| Quest Browser, same Wi-Fi | Open `https://<your-LAN-IP>:8081`, accept the certificate warning, press **Enter VR**. WebXR needs HTTPS. |
| Quest over USB | `adb reverse tcp:8081 tcp:8081`, then open `https://localhost:8081` on the headset. |
| Production build | `npm run build`, then `npm run preview`, or serve `dist/` on any static host. `localhost` counts as a secure context. |

Without a headset or the emulator, the page shows a desktop message and a static preview.

## Deploy (GitHub Pages)

- Every push to `main` runs `.github/workflows/deploy.yml`: `npm ci`, `npm run build`, then it publishes `dist/` to Pages (source: GitHub Actions).
- `vite.config.js` uses `base: './'`, so the same build works at `https://clrke.github.io/spatial-lab-webxr/` and on localhost.
- `.nojekyll` (repo root and `public/`) stops Jekyll processing.
- **Judging freeze:** do not push to `main` from 2026-11-18 12:00 PT until the winner announcement (about 2026-12-11). Each push redeploys the live link the judges use. See [SUBMISSION.md](SUBMISSION.md).

## Repo map

| Path | What |
|---|---|
| `index.html`, `js/main.js` | Boot: IWSDK world (hand tracking optional, with an on-screen prompt when hands are missing), the seated desk and head fit, the Reset button, the desktop fallback |
| `js/lessons/unit-circle.js` | Module 1: the grabbable unit circle, live triangle and sin/cos/tan bars, the self-drawing wave, the lesson flow and challenges |
| `js/lessons/match-wave.js` | Module 1 lesson 2: amplitude and frequency dials, ghost wave, match meter |
| `js/ui/` | `label.js` (canvas text panels, redrawn at most 10 Hz, face the user), `poke-button.js` (press with a fingertip or ray + pinch), `dial.js` (pinch the rim knob and drag it round) |
| `js/math/angle.js`, `js/audio.js` | Pure angle maths; synthesized sounds (no audio files) |
| `resonance.html`, `js/resonance/` | Prototype of the alternative Entertainment concept “Resonance”: spin two points of light in passthrough; each orbit sings a pentatonic note set by its speed, draws its wave, and together they trace the chord's Lissajous figure. For an A/B headset comparison with Spatial Lab |
| `capture.html`, `js/capture/` | Experimental: leg-capture tool (headset camera + head/hand poses + labelled seated leg motions) for building optional leg input. Live at `/capture.html` (`?quick=1` for a 20 s dry run) |
| `vite.config.js`, `package.json`, `.nvmrc` | Build setup |
| `.github/workflows/deploy.yml` | Pages deploy |
| [COMPETITION.md](COMPETITION.md) | Meta VR Start Developer Competition 2026 rules that matter |
| [SUBMISSION.md](SUBMISSION.md) | Submission checklist and timeline |
| [DESIGN.md](DESIGN.md) | Design doc |

## License

MIT, see [LICENSE](LICENSE).
