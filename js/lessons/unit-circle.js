// Module 1, lesson 1: the unit circle you can grab.
// Pinch the glowing point and drag it around the circle. The right triangle,
// sin/cos/tan bars and readout update live, and the sine wave (and the cosine,
// dotted) draws itself on a strip beside the circle as you turn.
// Flow (DESIGN.md): prompt -> play -> challenge -> payoff.
import { GrabSystem, Grabbed, OneHandGrabbable } from '@iwsdk/core';
import * as THREE from 'three';
import { sfx } from '../audio.js';
import { snapAngle, trigValues, toDegrees, piFraction, wrapDelta, wrapPositive, fmt, TAU } from '../math/angle.js';
import { createLabel } from '../ui/label.js';

const R = 0.13; // circle radius in metres (a "unit" of 13 cm)
const WAVE_GAP = 0.07; // gap between the circle and the wave strip
const WAVE_LEN = 0.4; // one full turn (0..2π) along the strip
const SAMPLES = 120; // wave resolution
const COVERAGE_GOAL = 0.92; // fraction of the turn to trace before the payoff

// Colour plus shape plus label, never colour alone (DESIGN.md accessibility).
const C = {
  ring: 0xc9d3e3,
  axis: 0x5b6a82,
  radius: 0xffffff,
  sin: 0xff9f43, // orange, solid bar / solid wave
  cos: 0x4fc3ff, // blue, solid bar / dotted wave
  tan: 0x7be07b, // green, thin bar on the tangent line
  point: 0xffe066,
  ghost: 0x3a465a,
};

const CHALLENGES = [
  { text: 'Make sin θ = 0.5', test: (v) => Math.abs(v.sin - 0.5) < 0.012 },
  { text: 'Make cos θ = 0', test: (v) => Math.abs(v.cos) < 0.012 },
  { text: 'Make tan θ = 1', test: (v) => v.tan !== null && Math.abs(v.tan - 1) < 0.025 },
  { text: 'Make sin θ = −1', test: (v) => Math.abs(v.sin + 1) < 0.004 },
  { text: 'Find a second angle where sin θ = 0.5', test: (v, s) => Math.abs(v.sin - 0.5) < 0.012 && Math.abs(toDegrees(s.angle) - s.firstHalf) > 20 },
];
const HOLD_SECONDS = 0.4; // a challenge counts once its condition holds this long

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
}

// A unit box stretched between two points in the circle plane (z = 0).
function makeBar(color, thickness = 0.006) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(color, { emissive: color, emissiveIntensity: 0.25 }));
  m.userData.t = thickness;
  return m;
}
function setBar(bar, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  bar.visible = len > 1e-4;
  if (!bar.visible) return;
  bar.position.set((ax + bx) / 2, (ay + by) / 2, 0);
  bar.rotation.set(0, 0, Math.atan2(dy, dx));
  bar.scale.set(len, bar.userData.t, bar.userData.t);
}

export function createUnitCircleLesson(world, { origin }) {
  // Everything lives under one group so the lab can be laid out as a unit.
  const root = new THREE.Group();
  root.position.copy(origin);
  world.scene.add(root);

  // ---- circle, axes, tangent guide
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0025, 8, 128), mat(C.ring));
  root.add(ring);
  const xAxis = makeBar(C.axis, 0.0025);
  setBar(xAxis, -R * 1.3, 0, R * 1.3, 0);
  const yAxis = makeBar(C.axis, 0.0025);
  setBar(yAxis, 0, -R * 1.3, 0, R * 1.3);
  const tanGuide = makeBar(C.axis, 0.0015);
  setBar(tanGuide, R, -R * 1.3, R, R * 1.3);
  root.add(xAxis, yAxis, tanGuide);

  // ---- live triangle and bars
  const radiusBar = makeBar(C.radius, 0.004);
  const cosBar = makeBar(C.cos, 0.009); // along the x axis
  const sinBar = makeBar(C.sin, 0.009); // vertical, from the axis to the point
  const tanBar = makeBar(C.tan, 0.005); // on the tangent line x = R
  root.add(radiusBar, cosBar, sinBar, tanBar);

  // Angle arc: a row of dots from 0 to θ (instanced: one draw call, no allocation).
  const ARC_DOTS = 72;
  const arc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0022, 6, 4), mat(C.point), ARC_DOTS);
  root.add(arc);

  // ---- the point and its grab volume
  const point = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 24, 16),
    mat(C.point, { emissive: C.point, emissiveIntensity: 0.6 }),
  );
  root.add(point);
  // An invisible 4 cm sphere is what the hand actually grabs (DESIGN.md: a large
  // grab volume around small points). It moves freely while held; the visible
  // point follows its projection onto the circle, and on release the proxy
  // snaps back to the point, so nothing can be dropped off the desk.
  const proxy = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 12, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  const proxyEntity = world.createTransformEntity(proxy);
  proxyEntity.addComponent(OneHandGrabbable, { translate: true, rotate: false });

  // ---- wave strip (to the right of the circle)
  const wave = new THREE.Group();
  wave.position.set(R + WAVE_GAP, 0, 0);
  root.add(wave);
  const waveAxis = makeBar(C.axis, 0.002);
  setBar(waveAxis, 0, 0, WAVE_LEN, 0);
  wave.add(waveAxis);
  for (const k of [1, 2, 3, 4]) {
    const tick = makeBar(C.axis, 0.002);
    setBar(tick, (k / 4) * WAVE_LEN, -0.006, (k / 4) * WAVE_LEN, 0.006);
    wave.add(tick);
  }
  const waveX = (a) => (wrapPositive(a) / TAU) * WAVE_LEN;
  const segGeo = new THREE.BoxGeometry(1, 1, 1);
  const ghost = new THREE.InstancedMesh(segGeo, new THREE.MeshBasicMaterial({ color: C.ghost }), SAMPLES);
  const sinTrace = new THREE.InstancedMesh(segGeo, mat(C.sin, { emissive: C.sin, emissiveIntensity: 0.3 }), SAMPLES);
  const cosTrace = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.0032, 6, 4),
    mat(C.cos, { emissive: C.cos, emissiveIntensity: 0.3 }),
    SAMPLES,
  );
  wave.add(ghost, sinTrace, cosTrace);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  function segMatrix(i, thickness) {
    const a0 = (i / SAMPLES) * TAU;
    const a1 = ((i + 1) / SAMPLES) * TAU;
    const x0 = (a0 / TAU) * WAVE_LEN;
    const x1 = (a1 / TAU) * WAVE_LEN;
    const y0 = R * Math.sin(a0);
    const y1 = R * Math.sin(a1);
    pos.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    q.setFromAxisAngle(zAxis, Math.atan2(y1 - y0, x1 - x0));
    scl.set(Math.hypot(x1 - x0, y1 - y0) * 1.05, thickness, thickness);
    return m4.compose(pos, q, scl);
  }
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < SAMPLES; i++) ghost.setMatrixAt(i, segMatrix(i, 0.0025));
  const visited = new Uint8Array(SAMPLES);
  function clearTraces() {
    visited.fill(0);
    for (let i = 0; i < SAMPLES; i++) {
      sinTrace.setMatrixAt(i, hidden);
      cosTrace.setMatrixAt(i, hidden);
    }
    sinTrace.instanceMatrix.needsUpdate = true;
    cosTrace.instanceMatrix.needsUpdate = true;
  }
  function markVisited(i) {
    if (visited[i]) return false;
    visited[i] = 1;
    sinTrace.setMatrixAt(i, segMatrix(i, 0.006));
    const a = ((i + 0.5) / SAMPLES) * TAU;
    cosTrace.setMatrixAt(i, m4.makeTranslation(waveX(a), R * Math.cos(a), 0));
    sinTrace.instanceMatrix.needsUpdate = true;
    cosTrace.instanceMatrix.needsUpdate = true;
    return true;
  }
  let coverage = 0;
  // Current position marker on the wave, and a link from the point to it.
  const waveDot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 16, 12), mat(C.sin, { emissive: C.sin, emissiveIntensity: 0.6 }));
  wave.add(waveDot);
  const link = makeBar(C.sin, 0.0015);
  root.add(link);

  // ---- labels: readout above the circle, prompt above the wave
  const readout = createLabel({ widthM: 0.3, heightM: 0.085 });
  readout.mesh.position.set(0, R + 0.075, 0);
  root.add(readout.mesh);
  const prompt = createLabel({ widthM: 0.36, heightM: 0.07 });
  prompt.mesh.position.set(R + WAVE_GAP + WAVE_LEN / 2, R + 0.075, 0);
  root.add(prompt.mesh);

  // ---- lesson state
  const state = {
    angle: Math.PI / 6, // start at 30°
    unwrapped: 0,
    held: false,
    step: 'intro', // intro -> explore -> payoff -> challenge -> done
    challenge: 0,
    holdTime: 0,
    payoffTime: 0,
    firstHalf: 30,
    pulse: 0,
    lastSnapDeg: null,
  };
  let promptLines = [];
  let overridePrompt = null; // e.g. "hands lost"

  function setPrompt(text, sub) {
    promptLines = [{ text, size: 66 }];
    if (sub) promptLines.push({ text: sub, size: 44, weight: 500, color: '#9aa7bb' });
  }

  function reset() {
    state.angle = Math.PI / 6;
    state.unwrapped = 0;
    state.step = 'intro';
    state.challenge = 0;
    state.holdTime = 0;
    coverage = 0;
    clearTraces();
    world.getSystem(GrabSystem)?.forceRelease(proxyEntity);
    setPrompt('Pinch the glowing point', 'Use your thumb and index finger');
  }

  const local = new THREE.Vector3();
  const world3 = new THREE.Vector3();

  function updateFigure() {
    const a = state.angle;
    const c = Math.cos(a) * R;
    const s = Math.sin(a) * R;
    point.position.set(c, s, 0);
    setBar(radiusBar, 0, 0, c, s);
    setBar(cosBar, 0, 0, c, 0);
    setBar(sinBar, c, 0, c, s);
    const v = trigValues(a);
    if (v.tan === null) tanBar.visible = false;
    else {
      const t = THREE.MathUtils.clamp(v.tan, -1.3, 1.3) * R;
      setBar(tanBar, R, 0, R, t);
    }
    const arcLen = wrapPositive(a);
    const dots = Math.round((arcLen / TAU) * ARC_DOTS);
    arc.count = dots;
    for (let i = 0; i < dots; i++) {
      const t = ((i + 0.5) / ARC_DOTS) * TAU;
      arc.setMatrixAt(i, m4.makeTranslation(Math.cos(t) * 0.032, Math.sin(t) * 0.032, 0));
    }
    arc.instanceMatrix.needsUpdate = true;
    const wx = waveX(a);
    waveDot.position.set(wx, s, 0);
    setBar(link, c, s, R + WAVE_GAP + wx, s);

    const deg = toDegrees(wrapPositive(a));
    const frac = piFraction(a);
    readout.setLines([
      { text: `θ = ${Math.round(deg) % 360}°   ${fmt(wrapPositive(a))} rad${frac ? ` (${frac})` : ''}`, size: 70 },
      {
        text: `sin ${fmt(v.sin)}    cos ${fmt(v.cos)}    tan ${v.tan === null ? 'undefined' : fmt(v.tan)}`,
        size: 62,
        weight: 600,
        color: '#dfe6f2',
      },
    ]);
  }

  // Called every frame by the lab system (after IWSDK's GrabSystem has moved the proxy).
  function update(dt, { handsMessage } = {}) {
    const held = proxyEntity.hasComponent(Grabbed);
    if (held !== state.held) {
      state.held = held;
      held ? sfx.grab() : sfx.release();
      if (held && state.step === 'intro') {
        state.step = 'explore';
        setPrompt('Drag it all the way around', 'Watch the wave draw itself');
      }
    }

    if (held) {
      proxy.getWorldPosition(world3);
      local.copy(world3);
      root.worldToLocal(local);
      if (Math.hypot(local.x, local.y) > 0.01) {
        const raw = Math.atan2(local.y, local.x);
        const next = snapAngle(raw);
        const d = wrapDelta(next - state.angle);
        state.unwrapped += d;
        // Mark every wave sample passed since the last frame (fast drags skip none).
        const steps = Math.ceil(Math.abs(d) / (TAU / SAMPLES)) + 1;
        for (let k = 0; k <= steps; k++) {
          const a = state.angle + (d * k) / steps;
          const i = Math.min(SAMPLES - 1, Math.floor((wrapPositive(a) / TAU) * SAMPLES));
          if (markVisited(i)) coverage += 1 / SAMPLES;
        }
        state.angle = next;
        const snappedDeg = Math.round(toDegrees(next));
        if (next !== wrapPositive(raw) && snappedDeg !== state.lastSnapDeg) sfx.tick();
        state.lastSnapDeg = next !== wrapPositive(raw) ? snappedDeg : null;
      }
    } else {
      // Not held: park the grab volume on the visible point.
      point.getWorldPosition(world3);
      proxy.position.copy(world3);
    }

    updateFigure();

    // Lesson flow
    const v = trigValues(state.angle);
    if (state.step === 'explore' && coverage >= COVERAGE_GOAL) {
      state.step = 'payoff';
      state.payoffTime = 0;
      sfx.success();
      setPrompt('You drew a sine wave!', 'Orange: sin θ.  Blue dots: cos θ.');
    } else if (state.step === 'payoff') {
      state.payoffTime += dt;
      if (state.payoffTime > 5) {
        state.step = 'challenge';
        state.challenge = 0;
        setPrompt(CHALLENGES[0].text, 'Hold it there for a moment');
      }
    } else if (state.step === 'challenge') {
      const ch = CHALLENGES[state.challenge];
      state.holdTime = ch.test(v, { angle: wrapPositive(state.angle), firstHalf: state.firstHalf }) ? state.holdTime + dt : 0;
      if (state.holdTime >= HOLD_SECONDS) {
        if (state.challenge === 0) state.firstHalf = toDegrees(wrapPositive(state.angle));
        state.holdTime = 0;
        state.challenge += 1;
        sfx.success();
        if (state.challenge >= CHALLENGES.length) {
          state.step = 'done';
          setPrompt('Lesson complete!', 'Press Reset to play again');
        } else {
          setPrompt(CHALLENGES[state.challenge].text, `Challenge ${state.challenge + 1} of ${CHALLENGES.length}`);
        }
      }
    }

    // The point pulses until it has been grabbed once ("pinch me").
    state.pulse += dt;
    const s = state.step === 'intro' ? 1 + 0.25 * Math.sin(state.pulse * 5) : held ? 1.25 : 1;
    point.scale.setScalar(s);

    const shown = handsMessage ?? null;
    if (shown !== overridePrompt) overridePrompt = shown;
    prompt.setLines(overridePrompt ? [{ text: overridePrompt, size: 56, color: '#ffd166' }] : promptLines);
    readout.flush();
    prompt.flush();
  }

  reset();
  updateFigure();
  readout.flush(performance.now(), true);
  prompt.flush(performance.now(), true);

  // Hide the lesson and stop its point from being grabbable while another lesson runs.
  function setActive(on) {
    root.visible = on;
    if (on && !proxyEntity.hasComponent(OneHandGrabbable)) {
      proxyEntity.addComponent(OneHandGrabbable, { translate: true, rotate: false });
    } else if (!on && proxyEntity.hasComponent(OneHandGrabbable)) {
      world.getSystem(GrabSystem)?.forceRelease(proxyEntity);
      proxyEntity.removeComponent(OneHandGrabbable);
    }
  }

  return { title: 'The unit circle', root, update, reset, setActive, labels: [readout.mesh, prompt.mesh], state };
}
