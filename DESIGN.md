# Spatial Lab: design

**One line:** math you can hold. Every concept is a physical object at real scale on a desk in front of you. You change it with your hands, and the numbers and laws update live beside it.

**Audience:** learners aged about 13 and up (high-school trigonometry, geometry and physics), and adults refreshing them. Seated, 5-10 minutes a lesson.

## Learning modules

Each module has 3-5 short lessons. Each lesson is: one prompt, hands-on play, one challenge, a payoff.

### 1. Trigonometry: the unit circle you can grab

| Interaction | What you do | What updates |
|---|---|---|
| Drag the point | Pinch the point on a 30 cm unit circle and drag it around | Angle in degrees and radians; sin, cos and tan as coloured bars on the axes, plus the values; the right triangle redraws |
| Unroll the wave | Keep turning the point; a sine wave is drawn on a wall-height strip beside you | Amplitude, period and phase; cos traced in a second colour |
| Match the curve | Twist a dial (pinch and rotate) to set amplitude and frequency until your wave overlays a ghost wave | Error meter; then a success chime |

### 2. Geometry: laws that hold however you stretch them

| Interaction | What you do | What updates |
|---|---|---|
| Stretch a triangle | Pinch-drag any corner | All three angles, with their sum fixed at 180°; side lengths |
| Scale with two hands | Grab a square or cube with both hands and pull apart | Side length, area (×4 when the side doubles), volume (×8); a ratio readout |
| Pythagoras tiles | Build a right triangle, then poke "show squares" | Squares on each side fill with unit tiles; the tiles from a² and b² pour into c² |

### 3. Physics: forces and motion at real scale (Havok)

| Interaction | What you do | What updates |
|---|---|---|
| Drop and throw | Pinch a ball, release or throw | Live trajectory arc; velocity vector (arrow) and gravity vector; time of flight; max height |
| Launch angle challenge | Set the angle and speed on a launcher by hand, then poke "fire" to hit a cup on the desk | Predicted parabola (toggle), range formula with your numbers |
| Ramp and friction | Tilt a ramp with one hand; place blocks of different materials | Force arrows (gravity, normal, friction); the block slides once tan θ > μ |

## Interaction patterns (hands only)

| Pattern | Used for | Notes |
|---|---|---|
| **Pinch-grab** (near) | Points, corners, balls, dials | IWSDK `OneHandGrabbable` with `useHandPinchForGrab`. A large invisible grab volume (at least 4 cm) around small points. Highlight on hover. |
| **Two-hand scale/rotate** | Shapes, the circle | `TwoHandsGrabbable { scale: true, scaleMin: [0.25,0.25,0.25], scaleMax: [4,4,4] }` (limits default to unbounded). Grab components are mutually exclusive per entity: never add `OneHandGrabbable` to the same entity |
| **Distance pinch** | Objects beyond reach | `DistanceGrabbable` (move towards target) for things dropped off the desk |
| **Poke** | Buttons on the desk edge ("reset", "show squares", "fire") | `PokeInteractable`; buttons at least 3 cm, with sound and a press-depth animation |
| **Gaze or ray + pinch** | Menus, lesson picker | Hand-ray + pinch on Quest 3/3S (no eye tracking). Eye gaze + pinch when `xr.features.gazeTracking` is granted (look-and-pinch on Meta VR Glasses). Menu items at least 6 cm apart. |
| **Microgestures** (optional) | Fine steps without grabbing | Thumb swipes on the index finger (Quest Browser hand gamepad buttons 5–8, confirmed on a Quest 3S; the thumb-tap index is still unconfirmed). No permission. Either hand. Lesson 1: swipe left/right turns the point ±15°. Lesson 2: left/right = frequency, forward/back = amplitude. Every action also works by pinching |
| **Throw** | Physics module | Release velocity from the average of the last ~100 ms of hand positions (one frame is noisy), capped at 8 m/s |

Robustness:
- Pinch hysteresis (engage around 0.8, release around 0.5), so pointing never grabs.
- Every grabbable returns to the desk if dropped out of reach.
- A "reset lesson" poke button is always visible.
- Hand-tracking loss: freeze the held object in place and show "hands lost: hold your hands in view".

## Seated comfort

- **Airplane seat layout:** on entering VR, the player rig is shifted so the user's real head (`world.player.head`) lands at the designed eye point: desk 40 cm below the eyes, about 45 cm forward (`fitToHead` in `js/main.js`). All interactables stay within a 60 cm reach. Nothing is behind the user or on the floor.
- **No locomotion:** the world comes to you; recentre with the system gesture.
- Static horizon, dark-neutral room, no camera motion, no forced head turns.
- Pause and resume: exiting VR keeps lesson state (local storage); re-entering resumes in place.

## FoV and readability

- Essential UI and readouts sit within about ±20° of straight ahead and slightly below eye level. Nothing critical near the edge of view (Meta FoV guidance: "Keep primary actions and status information near the center"). This matters for the narrower Meta VR Glasses view.
- Labels billboard toward the head, 0.6-1 m away. Values at least 2.5 cm tall at 75 cm. High-contrast text on a dark backing.

## Accessibility

| Feature | Detail |
|---|---|
| One-hand mode | Every two-hand action has a one-hand alternative (a scale handle) |
| Low-strength / limited reach | A "bring closer" poke pulls the desk 15 cm nearer; distance pinch everywhere |
| High-contrast and colour-blind safe | Sin, cos and tan use colour plus shape and labels, never colour alone; a high-contrast theme |
| Text size | 3 sizes |
| Audio | Optional narration of each prompt and spoken values on demand; captions always on |
| Pace | No timers in lessons; the challenges have an untimed mode |

## Performance budget (Quest 3/3S, Quest Browser)

| Budget | Target |
|---|---|
| Frame rate | 72 Hz (Quest Browser's WebXR default; scaffold calls `updateTargetFrameRate(72)`); **never below 60 fps** (judging minimum) |
| Draw calls | Under about 100 a frame: instanced tiles, merged static desk |
| Text | Redraw label textures only when a value changes, at most 10 Hz; no per-frame allocation |
| Physics | Havok in a worker (`features.physics`), 60 Hz fixed step, fewer than 30 bodies |
| Textures | Under 64 MB total; KTX2 if any |
| Cold start | Under about 10 s: trim bundled fonts, lazy-load each module |

## Mapping to the judging criteria (25% each)

| Criterion | How Spatial Lab scores |
|---|---|
| Innovation & Creativity | Abstract maths becomes a real-scale object you hold. Uses spatial depth, hands-first design and gaze. Repeat use comes from daily challenges and a mastery map. |
| Experience Design | Seated desk layout; first pinch inside 60 s; each lesson under 10 minutes ("one bus stop test"); FoV-centred readouts; one prompt at a time, no text walls |
| Technical Implementation | IWSDK hand grabbing, Havok physics, gaze or ray + pinch menus; 72 fps budget; tested with hands only on Quest 3 and 3S |
| Polish & Presentation | One coherent clean-lab art style; tactile sounds for grab, snap and success; honest headset footage in the video |

Passthrough: not in v1. Add a mixed-reality mode later only if the real desk becomes the lab surface (plane detection). Judging wants passthrough to be "purposeful".

## Special awards to aim for

| Award | Hook |
|---|---|
| **Best First Five Minutes** (primary) | No menu at start: a glowing point on a circle says "pinch me". The sine wave appears as you turn it. First "aha" in under 60 s, taught by doing. |
| **Best Reason to Come Back** | A mastery map (each concept fills in), a daily 3-minute challenge, a streak, and visible progress between sessions |
| **Best Accessibility Forward** | Seated by default, one-hand mode, high contrast, narration and captions, no timers |
| Boldest Original Concept | Real-scale physics and geometry: a parabola you throw yourself |

## Experimental: seated leg input (optional, on top of hands)

Goal: foot taps, stomps and knee lifts while seated as an extra input. Status: data collection.

- **Rules:** hands stay the complete input (hands-first is required), so every leg action has a hand equivalent; leg input is off by default, behind a toggle, with adjustable sensitivity, and never needed (wheelchair users, amputees, limited mobility). Only the headset is used (no third-party devices).
- **What the platform offers (checked 2026-10-20):** Quest has no leg sensors. Meta's body tracking legs are generated from the upper body (Generative Legs), so deliberate taps are invisible to it; the WebXR `body-tracking` feature is not in IWSDK and its availability in Quest Browser is unverified (the capture tool requests it and records it if granted). Quest Browser 154 exposes the passthrough cameras to web pages through `getUserMedia` (Quest 3S: "camera 0" 1280×960 and "camera 1" 640×480, 30 fps); frames could not be verified without someone wearing the headset. No camera pose or intrinsics on the web.
- **Permission finding (Quest 3S, Browser 154, 2026-10-20):** pressing "Allow camera" showed no prompt at all. The headset log shows Browser (uid 10098) failing its own system camera-permission checks (`HEADSET_CAMERA`, `SPATIAL_CAMERA`) on every attempt, so no camera was visible to the page. Browser does not ask for that permission by itself, and Meta's docs describe no web flow for it. On a judge's headset with default settings, camera-based leg input would therefore not work. For data capture on the dev headset the permissions were granted with `adb shell pm grant`.
- **First headset run (2026-10-20 08:55, Quest 3S, dim room, 34 s dry run):**
  - Camera works during an `immersive-ar` session: 1026 frames in 34.3 s (30 fps) at 1280×960 from "camera 1".
  - **WebXR `body-tracking` was granted without any flag**: 83 joints, including hips, upper/lower legs and five foot joints per side. But the legs are generated: during left toe taps the left foot moved under 0.2 cm vertically and both feet swayed equally (about 1 cm, following the upper body). Usable for upper-body/torso input, not for taps.
  - The head never pitched below 18° down, and at 15° down the camera showed the wall and floor ahead, not the legs. Seeing your own feet needs a much steeper look down, which is uncomfortable to repeat.
  - Microgestures: thumb swipes left/right/forward/back registered on both hands (button indices 5–8). No thumb tap (index 9) registered; the capture page now logs every hand button press to find the real index.
  - Verdict: camera leg input is technically possible but impractical (judges lack the permission, legs are out of view at comfortable head angles). Do not build it into the entry.
- **Planned approach:** motion energy in the lower image regions (downscaled grayscale frame differences), gated on head pitch (looking down) and low head motion, with hands masked out, classified with thresholds or a tiny classifier. Off-the-shelf pose models (MediaPipe, MoveNet) expect third-person views and are unlikely to work on a top-down view of your own knees.
- **Data:** `capture.html` records the camera (WebM) plus head and hand poses (JSON) through a beep-guided script of seated motions and negatives (about 7 minutes), saved as downloads on the headset. Camera frames are personal data: processed on-device, never uploaded by the app.
