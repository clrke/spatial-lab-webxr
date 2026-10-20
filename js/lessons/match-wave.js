// Module 1, lesson 2: match the curve.
// Two desk dials set the amplitude A and frequency f of y = A·sin(fθ). Turn them
// until your orange wave lies on the grey ghost wave; a meter shows how close
// you are. Four rounds, each ends with a chime (no timer).
import * as THREE from 'three';
import { sfx } from '../audio.js';
import { TAU, fmt } from '../math/angle.js';
import { createDial } from '../ui/dial.js';
import { createLabel } from '../ui/label.js';

const LEN = 0.5; // strip length: θ from 0 to 2π
const U = 0.1; // metres per unit of amplitude
const SAMPLES = 160;
const TARGETS = [
  { A: 1, f: 1 },
  { A: 0.5, f: 2 },
  { A: 1.5, f: 0.5 },
  { A: 0.75, f: 3 },
];
const START = { A: 0.5, f: 1.5 };
const HOLD_SECONDS = 0.4;

export function createMatchWaveLesson(world, { origin, deskY }) {
  const root = new THREE.Group();
  root.position.copy(origin);
  world.scene.add(root);

  const axis = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.002, 0.002), new THREE.MeshBasicMaterial({ color: 0x5b6a82 }));
  root.add(axis);
  for (const k of [0, 1, 2, 3, 4]) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.012, 0.002), new THREE.MeshBasicMaterial({ color: 0x5b6a82 }));
    tick.position.x = -LEN / 2 + (k / 4) * LEN;
    root.add(tick);
  }

  const seg = new THREE.BoxGeometry(1, 1, 1);
  const ghost = new THREE.InstancedMesh(seg, new THREE.MeshBasicMaterial({ color: 0x7c8aa3, transparent: true, opacity: 0.55 }), SAMPLES);
  const mine = new THREE.InstancedMesh(
    seg,
    new THREE.MeshStandardMaterial({ color: 0xff9f43, emissive: 0xff9f43, emissiveIntensity: 0.3 }),
    SAMPLES,
  );
  ghost.position.z = -0.004; // ghost just behind, so overlap reads as "on it"
  root.add(ghost, mine);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const y = (A, f, t) => A * U * Math.sin(f * t);
  function drawWave(mesh, A, f, thick) {
    for (let i = 0; i < SAMPLES; i++) {
      const t0 = (i / SAMPLES) * TAU;
      const t1 = ((i + 1) / SAMPLES) * TAU;
      const x0 = -LEN / 2 + (i / SAMPLES) * LEN;
      const x1 = -LEN / 2 + ((i + 1) / SAMPLES) * LEN;
      const y0 = y(A, f, t0);
      const y1 = y(A, f, t1);
      p.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
      q.setFromAxisAngle(zAxis, Math.atan2(y1 - y0, x1 - x0));
      s.set(Math.hypot(x1 - x0, y1 - y0) * 1.05, thick, thick);
      mesh.setMatrixAt(i, m4.compose(p, q, s));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // RMS distance between the curves, as a 0-100 % match.
  function matchPercent(a, b) {
    let sum = 0;
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * TAU;
      const d = y(a.A, a.f, t) - y(b.A, b.f, t);
      sum += d * d;
    }
    const rms = Math.sqrt(sum / 65) / U;
    return Math.max(0, Math.round(100 * (1 - rms / 0.9)));
  }

  const formula = createLabel({ widthM: 0.36, heightM: 0.085 });
  formula.mesh.position.set(-0.08, 0.2, 0);
  const prompt = createLabel({ widthM: 0.3, heightM: 0.07 });
  prompt.mesh.position.set(0.2, 0.2, 0);
  root.add(formula.mesh, prompt.mesh);

  const ampDial = createDial(world, {
    position: new THREE.Vector3(origin.x - 0.12, deskY, -0.36),
    min: 0.25, max: 1.5, step: 0.05, value: START.A,
    color: 0xff9f43, title: 'Amplitude A', format: (v) => fmt(v),
  });
  const freqDial = createDial(world, {
    position: new THREE.Vector3(origin.x + 0.06, deskY, -0.36),
    min: 0.5, max: 3, step: 0.25, value: START.f,
    color: 0x4fc3ff, title: 'Frequency f', format: (v) => fmt(v),
  });

  const state = { round: 0, hold: 0, done: false, celebrate: 0 };
  let promptLines = [];
  function setPrompt(text, sub) {
    promptLines = [{ text, size: 66 }];
    if (sub) promptLines.push({ text: sub, size: 44, weight: 500, color: '#9aa7bb' });
  }

  function redrawMine() {
    drawWave(mine, ampDial.value, freqDial.value, 0.006);
  }

  function reset() {
    state.round = 0;
    state.hold = 0;
    state.done = false;
    state.celebrate = 0;
    ampDial.set(START.A);
    freqDial.set(START.f);
    drawWave(ghost, TARGETS[0].A, TARGETS[0].f, 0.008);
    redrawMine();
    setPrompt('Match the grey wave', 'Pinch a dial knob and turn it');
  }

  function update(dt, { handsMessage } = {}) {
    if (ampDial.update() | freqDial.update()) redrawMine();
    const cur = { A: ampDial.value, f: freqDial.value };
    if (!state.done) {
      const target = TARGETS[state.round];
      // Just after a match, keep showing 100% for a moment before scoring the next target.
      state.celebrate = Math.max(0, state.celebrate - dt);
      const pct = state.celebrate > 0 ? 100 : matchPercent(cur, target);
      const exact = Math.abs(cur.A - target.A) < 0.026 && Math.abs(cur.f - target.f) < 0.13;
      state.hold = exact ? state.hold + dt : 0;
      formula.setLines([
        { text: `y = ${fmt(cur.A)} · sin(${fmt(cur.f)} θ)`, size: 70 },
        { text: `period ${Math.round(360 / cur.f)}°    match ${pct}%`, size: 58, weight: 600, color: pct >= 95 ? '#7be07b' : '#dfe6f2' },
      ]);
      if (state.hold >= HOLD_SECONDS) {
        state.hold = 0;
        state.round += 1;
        state.celebrate = 1.5;
        sfx.success();
        if (state.round >= TARGETS.length) {
          state.done = true;
          setPrompt('All waves matched!', 'Bigger A: taller. Bigger f: more waves.');
        } else {
          drawWave(ghost, TARGETS[state.round].A, TARGETS[state.round].f, 0.008);
          setPrompt('Matched! Next wave', `Round ${state.round + 1} of ${TARGETS.length}`);
        }
      }
    }
    prompt.setLines(handsMessage ? [{ text: handsMessage, size: 56, color: '#ffd166' }] : promptLines);
    formula.flush();
    prompt.flush();
  }

  // Microgestures: swipe left/right changes frequency, forward/back amplitude.
  function onMicrogesture({ name }) {
    const f = { 'swipe-right': 0.25, 'swipe-left': -0.25 }[name];
    const A = { 'swipe-forward': 0.05, 'swipe-backward': -0.05 }[name];
    if (f) freqDial.set(Math.min(3, Math.max(0.5, Math.round((freqDial.value + f) * 4) / 4)));
    else if (A) ampDial.set(Math.min(1.5, Math.max(0.25, Math.round((ampDial.value + A) * 20) / 20)));
    else return;
    sfx.tick();
    redrawMine();
  }

  function setActive(on) {
    root.visible = on;
    ampDial.setActive(on);
    freqDial.setActive(on);
  }

  reset();
  formula.flush(performance.now(), true);
  prompt.flush(performance.now(), true);

  return {
    title: 'Match the curve',
    root,
    update,
    reset,
    setActive,
    onMicrogesture,
    labels: [formula.mesh, prompt.mesh, ampDial.label, freqDial.label],
    state,
  };
}
