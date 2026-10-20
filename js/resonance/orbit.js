// One "orbit": a glowing point on a ring that you pinch and spin. Released, it
// keeps orbiting with the speed you gave it; that speed picks a note from a
// pentatonic scale (so any two orbits sound good together), and the point's
// height is drawn as a wave flowing out of the ring.
import { GrabSystem, Grabbed, OneHandGrabbable } from '@iwsdk/core';
import * as THREE from 'three';
import { TAU, wrapDelta } from '../math/angle.js';

const R = 0.1; // ring radius (m)
const TRAIL = 160; // wave samples
const TRAIL_LEN = 0.32; // wave length in metres
const SCALE = [0, 2, 4, 7, 9]; // major pentatonic (semitones)
const BASE_HZ = 196; // G3

export function noteFor(revsPerSecond) {
  // 0.25 rev/s -> lowest note; each 0.25 rev/s faster -> one scale step up (2 octaves).
  const step = Math.max(0, Math.min(SCALE.length * 2 - 1, Math.round(revsPerSecond * 4) - 1));
  const semis = SCALE[step % SCALE.length] + 12 * Math.floor(step / SCALE.length);
  return { step, hz: BASE_HZ * 2 ** (semis / 12) };
}

export function createOrbit(world, { position, color, trailDir = 1 }) {
  const root = new THREE.Group();
  root.position.copy(position);
  world.scene.add(root);

  const mat = (c, e = 0.5) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.4 });
  root.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.002, 8, 96), mat(0xc9d3e3, 0.2)));
  const point = new THREE.Mesh(new THREE.SphereGeometry(0.013, 24, 16), mat(color, 0.9));
  root.add(point);
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(1, 0.003, 0.003), mat(color, 0.4));
  root.add(spoke);

  // Wave flowing sideways out of the ring (away from the centre of the stage).
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0035, 6, 4), mat(color, 0.7), TRAIL);
  root.add(dots);
  const trail = new Float32Array(TRAIL); // past heights, newest first
  const m4 = new THREE.Matrix4();

  // Grab volume (4 cm) that the hand actually pinches.
  const proxy = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 12, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  const proxyEntity = world.createTransformEntity(proxy);
  proxyEntity.addComponent(OneHandGrabbable, { translate: true, rotate: false });

  const state = { angle: Math.PI / 2, omega: 0, held: false, spun: false };
  const history = []; // [timeS, unwrappedAngle] while held
  let unwrapped = state.angle;
  const local = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let sampleClock = 0;

  function update(dt, t) {
    const held = proxyEntity.hasComponent(Grabbed);
    if (held && !state.held) history.length = 0;
    if (!held && state.held) {
      // Release: angular velocity over the last ~120 ms of the drag (one frame is noisy).
      const recent = history.filter(([ht]) => t - ht <= 0.12);
      if (recent.length >= 2) {
        const [t0, a0] = recent[0];
        const [t1, a1] = recent[recent.length - 1];
        state.omega = t1 > t0 ? (a1 - a0) / (t1 - t0) : 0;
      }
      if (Math.abs(state.omega) > 0.8) state.spun = true;
    }
    state.held = held;

    if (held) {
      proxy.getWorldPosition(local);
      root.worldToLocal(local);
      if (Math.hypot(local.x, local.y) > 0.01) {
        const a = Math.atan2(local.y, local.x);
        unwrapped += wrapDelta(a - state.angle);
        state.angle = a;
        history.push([t, unwrapped]);
        if (history.length > 40) history.shift();
      }
    } else {
      state.omega *= Math.exp(-dt / 25); // a long, slow fade
      if (Math.abs(state.omega) < 0.3) state.omega = 0;
      state.angle = (state.angle + state.omega * dt) % TAU;
      point.getWorldPosition(tmp);
      proxy.position.copy(tmp);
    }

    const c = Math.cos(state.angle) * R;
    const s = Math.sin(state.angle) * R;
    point.position.set(c, s, 0);
    spoke.position.set(c / 2, s / 2, 0);
    spoke.rotation.z = state.angle;
    spoke.scale.x = R;

    // Scroll the wave at a fixed rate so faster spins show more cycles.
    sampleClock += dt;
    while (sampleClock >= 1 / 90) {
      sampleClock -= 1 / 90;
      trail.copyWithin(1, 0);
      trail[0] = s;
    }
    for (let i = 0; i < TRAIL; i++) {
      m4.makeTranslation(trailDir * (R + 0.015 + (i / TRAIL) * TRAIL_LEN), trail[i], 0);
      dots.setMatrixAt(i, m4);
    }
    dots.instanceMatrix.needsUpdate = true;
    point.scale.setScalar(held ? 1.3 : 1 + 0.15 * Math.sin(t * 5) * (state.spun ? 0 : 1));
  }

  function stop() {
    world.getSystem(GrabSystem)?.forceRelease(proxyEntity);
    state.omega = 0;
  }

  const revsPerSecond = () => Math.abs(state.omega) / TAU;
  return { root, point, update, stop, state, revsPerSecond };
}
