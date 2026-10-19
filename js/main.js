// Spatial Lab scaffold: one grabbable cube and a floating label that reports
// its height above the desk, live. Hands only (pinch to grab, two hands to scale).
import {
  createSystem,
  Grabbed,
  OneHandGrabbable,
  ReferenceSpaceType,
  SessionMode,
  TwoHandsGrabbable,
  VisibilityState,
  World,
} from '@iwsdk/core';
import * as THREE from 'three';

const SEATED_EYE_Y = 1.2; // metres; layout below assumes this eye height
const DESK_BELOW_EYES = 0.4; // desk top sits this far below the eyes
let deskTopY = SEATED_EYE_Y - DESK_BELOW_EYES;
let fitPending = false; // re-fit the lab to the real head height on entering VR
const fitTargets = []; // objects moved together when re-fitting
const statusEl = document.getElementById('status');
const enterBtn = document.getElementById('enter');
const fallbackEl = document.getElementById('fallback');
const overlayEl = document.getElementById('overlay');

// ---------- floating label (canvas texture, redrawn only when the text changes)
function createLabel(widthM = 0.42, heightM = 0.12) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round((1024 * heightM) / widthM);
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(widthM, heightM),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
  );
  let last = '';
  function setText(title, value) {
    const key = `${title}|${value}`;
    if (key === last) return;
    last = key;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(16,20,28,0.85)';
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 48);
    ctx.fill();
    ctx.fillStyle = '#9aa7bb';
    ctx.font = '600 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, canvas.height * 0.36);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 84px system-ui, sans-serif';
    ctx.fillText(value, canvas.width / 2, canvas.height * 0.82);
    texture.needsUpdate = true;
  }
  return { mesh, setText };
}

// ---------- system: keep the label in sync with the grabbed object
let label;
let cubeEntity;
const idleColor = new THREE.Color(0x4f8cff);
const heldColor = new THREE.Color(0xffb84f);

class LabelSystem extends createSystem({ grabbables: { required: [OneHandGrabbable] } }) {
  update() {
    if (!cubeEntity?.object3D || !label) return;
    const obj = cubeEntity.object3D;
    if (fitPending) fitToHead(this.world);
    const held = cubeEntity.hasComponent(Grabbed);
    obj.material.color.copy(held ? heldColor : idleColor);
    const heightCm = Math.max(0, (obj.position.y - deskTopY) * 100);
    const sizeCm = obj.scale.x * 10; // cube is 10 cm at scale 1
    label.setText(
      held ? 'Holding: height above desk' : 'Pinch the cube to grab it',
      `${heightCm.toFixed(0)} cm  |  edge ${sizeCm.toFixed(1)} cm`,
    );
  }
}

// Seated or standing: move the desk, cube and label so the desk sits a fixed
// distance below the user's eyes, once per session (an "airplane seat" layout).
const headPos = new THREE.Vector3();
function fitToHead(world) {
  world.camera.getWorldPosition(headPos);
  if (headPos.y < 0.3) return; // no head pose yet
  fitPending = false;
  const targetDeskY = headPos.y - DESK_BELOW_EYES;
  const dy = targetDeskY - deskTopY;
  for (const o of fitTargets) o.position.y += dy;
  deskTopY = targetDeskY;
}

// ---------- scene
async function start() {
  const container = document.getElementById('scene-container');
  const world = await World.create(container, {
    xr: {
      sessionMode: SessionMode.ImmersiveVR,
      referenceSpace: ReferenceSpaceType.LocalFloor,
      features: { handTracking: { required: true }, layers: true },
      offer: 'always', // Quest Browser shows its own Enter VR prompt too
    },
    features: { grabbing: { useHandPinchForGrab: true } },
    render: { camera: { position: [0, 1.25, 0.35], lookAt: [0, 0.9, -0.6] } },
  });

  const { scene } = world;
  scene.background = new THREE.Color(0x10141c);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x303845, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(0.5, 2, 1);
  scene.add(sun);

  // Desk within a seated reach (about 45 cm in front).
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.04, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x3a4456, roughness: 0.8 }),
  );
  desk.position.set(0, deskTopY - 0.02, -0.55);
  scene.add(desk);

  // The grabbable object: pinch with one hand to move/rotate, two hands to scale.
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: idleColor, roughness: 0.4 }),
  );
  cubeEntity = world.createTransformEntity(cube);
  cubeEntity.object3D.position.set(0, deskTopY + 0.18, -0.45);
  cubeEntity
    .addComponent(OneHandGrabbable, { rotate: true, translate: true })
    .addComponent(TwoHandsGrabbable, { rotate: true, translate: true, scale: true });

  // Floating label: centred, slightly below eye line, inside a narrow FoV.
  label = createLabel();
  label.mesh.position.set(0, SEATED_EYE_Y - 0.12, -0.75);
  label.mesh.lookAt(0, SEATED_EYE_Y, 0);
  scene.add(label.mesh);
  fitTargets.push(desk, cubeEntity.object3D, label.mesh);

  world.registerSystem(LabelSystem);

  // Hide the 2D card while immersive; Quest Browser defaults WebXR to 72 Hz.
  world.visibilityState.subscribe((state) => {
    overlayEl.hidden = state !== VisibilityState.NonImmersive;
  });
  world.renderer.xr.addEventListener('sessionstart', () => {
    fitPending = true;
    const session = world.renderer.xr.getSession();
    session?.updateTargetFrameRate?.(72).catch(() => {});
  });

  enterBtn.addEventListener('click', () => world.launchXR());

  // Installed as an immersive PWA (Quest APK via bubblewrap) there is no 2D page:
  // enter VR on launch. getDigitalGoodsService exists only in the installed PWA,
  // so a normal Quest Browser tab keeps its Enter VR button (hz-store-pwa, Step 1).
  if ('getDigitalGoodsService' in window && (await checkSupport())) world.launchXR();
  return world;
}

async function checkSupport() {
  try {
    return Boolean(navigator.xr && (await navigator.xr.isSessionSupported('immersive-vr')));
  } catch {
    return false;
  }
}

const supported = await checkSupport();
if (supported) {
  statusEl.textContent = 'Ready. Put your controllers down; your hands are the tools.';
  enterBtn.hidden = false;
} else {
  statusEl.textContent = 'No VR headset detected.';
  fallbackEl.hidden = false;
}
start().catch((err) => {
  console.error(err);
  statusEl.textContent = `Could not start the 3D scene: ${err.message}`;
});
