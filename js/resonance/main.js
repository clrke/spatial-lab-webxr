// Resonance (prototype): music is circles. Spin two glowing points; each orbit
// sings a note set by its speed, draws its wave, and together they trace a
// Lissajous figure: the shape of the chord. Mixed reality (passthrough), seated,
// hands only. Built from Spatial Lab's pieces to compare the two concepts.
import { ReferenceSpaceType, SessionMode, VisibilityState, World, createSystem } from '@iwsdk/core';
import * as THREE from 'three';
import { pollMicrogestures } from '../input/microgestures.js';
import { createLabel, faceYaw } from '../ui/label.js';
import { PokeButtonSystem, createPokeButton } from '../ui/poke-button.js';
import { createOrbit, noteFor } from './orbit.js';
import { createVoice, unlock, updateListener } from './voices.js';

const EYE_Y = 1.2;
const STAGE_Y = EYE_Y - 0.22; // orbits sit a little below eye level
const statusEl = document.getElementById('status');
const enterBtn = document.getElementById('enter');
const overlayEl = document.getElementById('overlay');

let orbits = [];
let voices = [];
let prompt;
let fitPending = false;
let frames = 0;
let step = 'intro';
const head = new THREE.Vector3();
const headQ = new THREE.Quaternion();

// Lissajous figure between the orbits: x from orbit A, y from orbit B.
const LISS = 200; // about 3 s of trace, so old shapes clear quickly
let liss;
const lissPts = new Float32Array(LISS * 2);
let lissHead = 0;
let lissReset = true; // refill the trace (start, and whenever an orbit is grabbed or released)
const wasHeld = [false, false];

function fitToHead(world) {
  const h = world.player.head.position;
  if (h.lengthSq() < 1e-6 && frames < 36) return;
  world.player.position.set(-h.x, EYE_Y - h.y, -h.z);
  fitPending = false;
}

function setPrompt(lines) {
  prompt.setLines(lines);
}

class ResonanceSystem extends createSystem({}) {
  update(delta, time) {
    const world = this.world;
    const dt = Math.min(delta, 0.1);
    const inXR = world.renderer.xr.isPresenting;
    if (inXR) frames += 1;
    if (fitPending && inXR) fitToHead(world);
    if (inXR) {
      pollMicrogestures(world.renderer.xr.getSession(), ({ name }) => {
        // Swipe forward/back nudges both orbits faster/slower by one note.
        const k = { 'swipe-forward': 1, 'swipe-backward': -1 }[name];
        if (k) for (const o of orbits) if (o.state.omega) o.state.omega += Math.sign(o.state.omega) * k * (Math.PI / 2);
      });
    }

    orbits.forEach((o, i) => {
      o.update(dt, time);
      const rps = o.revsPerSecond();
      const { hz } = noteFor(Math.max(rps, 0.25));
      o.point.getWorldPosition(head); // the note comes from where its point is
      voices[i].set({ hz, gain: rps >= 0.2 ? Math.min(0.22, 0.08 + rps * 0.06) : 0, position: head });
    });

    // Lissajous trace
    const [a, b] = orbits;
    orbits.forEach((o, i) => {
      if (o.state.held !== wasHeld[i]) lissReset = true;
      wasHeld[i] = o.state.held;
    });
    const lx = Math.cos(a.state.angle) * 0.09;
    const ly = Math.sin(b.state.angle) * 0.09;
    if (lissReset) {
      for (let i = 0; i < LISS; i++) {
        lissPts[i * 2] = lx;
        lissPts[i * 2 + 1] = ly;
      }
      lissReset = false;
    }
    lissPts[lissHead * 2] = lx;
    lissPts[lissHead * 2 + 1] = ly;
    lissHead = (lissHead + 1) % LISS;
    const pos = liss.geometry.attributes.position;
    for (let i = 0; i < LISS; i++) {
      const j = ((lissHead + i) % LISS) * 2;
      pos.setXYZ(i, lissPts[j], lissPts[j + 1], 0);
    }
    pos.needsUpdate = true;
    liss.material.opacity = a.state.omega && b.state.omega ? 0.95 : 0.25;

    // Lesson-free guidance: three beats, no text walls.
    const spun = orbits.filter((o) => o.state.spun).length;
    if (step === 'intro' && spun >= 1) step = 'second';
    if (step === 'second' && spun >= 2) step = 'chord';
    const lines = {
      intro: [{ text: 'Pinch a glowing point and spin it', size: 64 }, { text: 'Let go while it moves', size: 46, color: '#9aa7bb', weight: 500 }],
      second: [{ text: 'Now spin the other one', size: 64 }, { text: 'Faster spin = higher note', size: 46, color: '#9aa7bb', weight: 500 }],
      chord: [{ text: 'That shape is your chord', size: 64 }, { text: 'Music is circles. Try other speeds.', size: 46, color: '#9aa7bb', weight: 500 }],
    }[step];
    setPrompt(lines);
    prompt.flush();

    if (inXR) {
      world.player.head.getWorldPosition(head);
      world.player.head.getWorldQuaternion(headQ);
      updateListener(head, headQ);
    } else world.camera.getWorldPosition(head);
    faceYaw(prompt.mesh, head);
  }
}

async function start() {
  const world = await World.create(document.getElementById('scene-container'), {
    xr: {
      sessionMode: SessionMode.ImmersiveAR, // passthrough: your room is the stage
      referenceSpace: ReferenceSpaceType.LocalFloor,
      features: { handTracking: true },
    },
    features: { grabbing: { useHandPinchForGrab: true } },
    render: { camera: { position: [0, 1.22, 0.25], lookAt: [0, 1.0, -0.5] } },
  });
  const { scene } = world;
  scene.background = null; // transparent in AR so the room shows through
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x303845, 1.5));

  orbits = [
    createOrbit(world, { position: new THREE.Vector3(-0.17, STAGE_Y, -0.5), color: 0xff9f43, trailDir: -1 }),
    createOrbit(world, { position: new THREE.Vector3(0.17, STAGE_Y, -0.5), color: 0x4fc3ff, trailDir: 1 }),
  ];
  voices = [createVoice(), createVoice()];
  window.__resonance = { orbits, get step() { return step; } }; // for automated tests

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LISS * 3), 3));
  liss = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xfff1c1, transparent: true, opacity: 0.25 }));
  liss.position.set(0, STAGE_Y, -0.5);
  scene.add(liss);

  prompt = createLabel({ widthM: 0.4, heightM: 0.08 });
  prompt.mesh.position.set(0, STAGE_Y + 0.19, -0.55);
  scene.add(prompt.mesh);

  createPokeButton(world, {
    text: 'Quiet',
    position: new THREE.Vector3(0, STAGE_Y - 0.2, -0.38),
    color: 0x8a6bff,
    onPress: () => orbits.forEach((o) => o.stop()),
  });

  world.registerSystem(PokeButtonSystem);
  world.registerSystem(ResonanceSystem);
  world.visibilityState.subscribe((s) => {
    overlayEl.hidden = s !== VisibilityState.NonImmersive;
  });
  world.renderer.xr.addEventListener('sessionstart', () => {
    fitPending = true;
    frames = 0;
    world.renderer.xr.getSession()?.updateTargetFrameRate?.(72).catch(() => {});
  });
  world.renderer.xr.addEventListener('sessionend', () => world.player.position.set(0, 0, 0));
  return world;
}

const supported = await navigator.xr?.isSessionSupported('immersive-ar').catch(() => false);
try {
  const world = await start();
  if (supported) {
    statusEl.textContent = 'Ready. Sit down, put your controllers away, and turn the sound up.';
    enterBtn.hidden = false;
    enterBtn.addEventListener('click', () => {
      unlock();
      world.launchXR();
    });
  } else statusEl.textContent = 'Open this page in Meta Quest Browser on a Quest 3 or 3S.';
} catch (err) {
  console.error(err);
  statusEl.textContent = `Could not start: ${err.message}`;
}
