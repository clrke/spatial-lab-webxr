// Spatial Lab: hands-first WebXR lab. Bootstraps the IWSDK world, the seated
// desk layout, the always-visible Reset button and Module 1 (the unit circle).
import { ReferenceSpaceType, SessionMode, VisibilityState, World, createSystem } from '@iwsdk/core';
import * as THREE from 'three';
import { sfx, unlockAudio } from './audio.js';
import { createUnitCircleLesson } from './lessons/unit-circle.js';
import { faceYaw } from './ui/label.js';
import { PokeButtonSystem, createPokeButton } from './ui/poke-button.js';

// The lab is laid out for eyes at (0, EYE_Y, 0) looking down -Z, with the desk
// top DESK_BELOW_EYES lower ("airplane seat": everything within ~60 cm reach).
// On entering VR the player rig is shifted so the user's real head lands there.
const EYE_Y = 1.2;
const DESK_BELOW_EYES = 0.4;
const DESK_Y = EYE_Y - DESK_BELOW_EYES;

const statusEl = document.getElementById('status');
const enterBtn = document.getElementById('enter');
const fallbackEl = document.getElementById('fallback');
const overlayEl = document.getElementById('overlay');

let lesson;
let fitPending = false;
let framesInSession = 0;
const headWorld = new THREE.Vector3();

// Shift the player rig so the head sits at the designed eye point. Reads
// world.player.head, which IWSDK updates from the viewer pose before systems
// run (world.camera is only updated later, inside renderer.render).
function fitToHead(world) {
  const head = world.player.head.position; // local to the rig
  const posed = head.lengthSq() > 1e-6;
  // Wait for a real pose; if the runtime fell back to a 'local' space (head y ~ 0)
  // the same offset is still right, so give up waiting after half a second.
  if (!posed && framesInSession < 36) return;
  world.player.position.set(-head.x, EYE_Y - head.y, -head.z);
  fitPending = false;
}

function handsMessage(world) {
  const session = world.renderer.xr.getSession?.();
  if (!session) return null;
  const sources = Array.from(session.inputSources ?? []);
  if (sources.some((s) => s.hand)) return null;
  if (sources.length > 0) return 'Put your controllers down: this lab uses your hands';
  return 'Hands lost: hold your hands in view';
}

class LabSystem extends createSystem({}) {
  update(delta) {
    const world = this.world;
    const inXR = world.renderer.xr.isPresenting;
    if (inXR) framesInSession += 1;
    if (fitPending && inXR) fitToHead(world);

    // After a short grace period, prompt if no hands are tracked.
    const msg = inXR && framesInSession > 90 ? handsMessage(world) : null;
    lesson.update(Math.min(delta, 0.1), { handsMessage: msg });

    // Labels turn to face the user (yaw only, so text stays upright).
    if (inXR) world.player.head.getWorldPosition(headWorld);
    else world.camera.getWorldPosition(headWorld);
    for (const m of lesson.labels) faceYaw(m, headWorld);
  }
}

async function start() {
  const container = document.getElementById('scene-container');
  const world = await World.create(container, {
    xr: {
      sessionMode: SessionMode.ImmersiveVR,
      referenceSpace: ReferenceSpaceType.LocalFloor,
      // Optional, not required: a required feature the browser refuses makes
      // the whole session request fail silently. Without hands we show a prompt.
      features: { handTracking: true },
    },
    features: { grabbing: { useHandPinchForGrab: true } },
    render: { camera: { position: [0, 1.25, 0.3], lookAt: [0.12, 0.98, -0.5] } },
  });

  const { scene } = world;
  scene.background = new THREE.Color(0x10141c);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x303845, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(0.5, 2, 1);
  scene.add(sun);

  // Desk: 1 m wide, front edge 25 cm in front of the eyes.
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.04, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x3a4456, roughness: 0.8 }),
  );
  desk.position.set(0, DESK_Y - 0.02, -0.55);
  scene.add(desk);

  // Module 1: the unit circle stands on the desk, slightly left of centre so the
  // wave strip to its right stays inside a narrow field of view.
  lesson = createUnitCircleLesson(world, { origin: new THREE.Vector3(-0.2, DESK_Y + 0.2, -0.5) });

  // Always-visible Reset on the desk's front edge.
  createPokeButton(world, {
    text: 'Reset',
    position: new THREE.Vector3(0.3, DESK_Y, -0.33),
    color: 0x8a6bff,
    onPress: () => {
      lesson.reset();
      sfx.success();
    },
  });

  world.registerSystem(PokeButtonSystem);
  world.registerSystem(LabSystem);

  // Hide the 2D card while immersive.
  world.visibilityState.subscribe((state) => {
    overlayEl.hidden = state !== VisibilityState.NonImmersive;
  });
  world.renderer.xr.addEventListener('sessionstart', () => {
    fitPending = true;
    framesInSession = 0;
    const session = world.renderer.xr.getSession();
    session?.updateTargetFrameRate?.(72).catch(() => {});
  });
  world.renderer.xr.addEventListener('sessionend', () => {
    world.player.position.set(0, 0, 0);
  });

  return world;
}

async function checkSupport() {
  try {
    return Boolean(navigator.xr && (await navigator.xr.isSessionSupported('immersive-vr')));
  } catch {
    return false;
  }
}

const READY_TEXT = 'Ready. Put your controllers down; your hands are the tools.';

function launch(world) {
  unlockAudio();
  statusEl.textContent = 'Starting VR...';
  world.launchXR();
  // IWSDK only logs a failed session request; tell the user something.
  setTimeout(() => {
    if (!world.renderer.xr.isPresenting) {
      statusEl.textContent = 'VR did not start. Press Enter VR again, or use the browser\'s own VR button.';
    }
  }, 6000);
}

// Installed immersive PWA (Quest APK via bubblewrap): there is no 2D page, so the
// app must enter VR by itself. Detect it with display-mode or a start_url flag
// (?pwa=1). Not getDigitalGoodsService: Quest Browser 154 exposes it in normal
// tabs too, where a launch without a tap fails with "requires user activation".
function isInstalledPwa() {
  return (
    new URLSearchParams(location.search).has('pwa') ||
    matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches
  );
}

const supported = await checkSupport();
statusEl.textContent = supported ? 'Loading the lab...' : 'No VR headset detected.';
if (!supported) fallbackEl.hidden = false;

try {
  const world = await start();
  if (supported) {
    // Only offer Enter VR once the world can actually launch.
    statusEl.textContent = READY_TEXT;
    enterBtn.hidden = false;
    enterBtn.addEventListener('click', () => launch(world));
    world.renderer.xr.addEventListener('sessionend', () => {
      statusEl.textContent = READY_TEXT;
    });
    if (isInstalledPwa()) world.launchXR();
  }
} catch (err) {
  console.error(err);
  statusEl.textContent = `Could not start the 3D scene: ${err.message}`;
}
