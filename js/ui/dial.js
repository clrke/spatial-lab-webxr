// A dial lying flat on the desk: pinch the knob on its rim and drag it round.
// Like the unit-circle point, the hand grabs an invisible proxy volume; the
// knob follows the proxy's angle around the dial centre and the proxy snaps back
// to the knob on release. One hand is enough (no wrist twist needed).
import { GrabSystem, Grabbed, OneHandGrabbable } from '@iwsdk/core';
import * as THREE from 'three';
import { sfx } from '../audio.js';
import { wrapDelta } from '../math/angle.js';
import { createLabel } from './label.js';

const SWEEP = (135 * Math.PI) / 180; // ±135° from 12 o'clock

export function createDial(world, { position, radius = 0.045, min, max, step, value, color = 0xff9f43, title, format }) {
  const root = new THREE.Group();
  root.position.copy(position);
  world.scene.add(root);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.05, 0.01, 48),
    new THREE.MeshStandardMaterial({ color: 0x232a36, roughness: 0.7 }),
  );
  base.position.y = 0.005;
  root.add(base);
  // Scale marks at min, middle and max.
  for (const t of [0, 0.5, 1]) {
    const a = -SWEEP + t * 2 * SWEEP;
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.002, 0.012), new THREE.MeshBasicMaterial({ color: 0x9aa7bb }));
    mark.position.set(Math.sin(a) * (radius + 0.012), 0.002, -Math.cos(a) * (radius + 0.012));
    mark.rotation.y = -a;
    root.add(mark);
  }
  const pointer = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.004, radius * 0.8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 }),
  );
  root.add(pointer);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 20, 14),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 }),
  );
  root.add(knob);

  const proxy = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  const proxyEntity = world.createTransformEntity(proxy);
  proxyEntity.addComponent(OneHandGrabbable, { translate: true, rotate: false });

  const label = createLabel({ widthM: 0.14, heightM: 0.04 });
  label.mesh.position.set(0, 0.045, -radius - 0.03); // behind the dial, never over the knob
  root.add(label.mesh);

  const state = { value, angle: 0, held: false };
  const toAngle = (v) => -SWEEP + ((v - min) / (max - min)) * 2 * SWEEP;
  const fromAngle = (a) => {
    const raw = min + ((a + SWEEP) / (2 * SWEEP)) * (max - min);
    return Math.min(max, Math.max(min, Math.round(raw / step) * step));
  };

  const local = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  function place() {
    const a = toAngle(state.value);
    knob.position.set(Math.sin(a) * radius, 0.018, -Math.cos(a) * radius);
    pointer.position.set(Math.sin(a) * radius * 0.45, 0.013, -Math.cos(a) * radius * 0.45);
    pointer.rotation.y = -a;
    label.setLines([
      { text: title, size: 90, weight: 600, color: '#9aa7bb' },
      { text: format(state.value), size: 120 },
    ]);
  }

  /** Returns true when the value changed this frame. */
  function update() {
    const held = proxyEntity.hasComponent(Grabbed);
    if (held !== state.held) {
      state.held = held;
      held ? sfx.grab() : sfx.release();
      state.angle = toAngle(state.value);
    }
    let changed = false;
    if (held) {
      proxy.getWorldPosition(local);
      root.worldToLocal(local);
      if (Math.hypot(local.x, local.z) > 0.008) {
        // Follow the hand continuously and clamp at the ends (no wrap-around jumps).
        const a = Math.atan2(local.x, -local.z);
        state.angle = Math.max(-SWEEP, Math.min(SWEEP, state.angle + wrapDelta(a - state.angle)));
        const v = fromAngle(state.angle);
        if (v !== state.value) {
          state.value = v;
          changed = true;
          sfx.tick();
        }
      }
    } else {
      knob.getWorldPosition(tmp);
      proxy.position.copy(tmp);
    }
    place();
    label.flush();
    knob.scale.setScalar(held ? 1.25 : 1);
    return changed;
  }

  function set(v) {
    state.value = v;
    state.angle = toAngle(v);
    place();
    label.flush(performance.now(), true);
  }

  function setActive(on) {
    root.visible = on;
    if (on && !proxyEntity.hasComponent(OneHandGrabbable)) {
      proxyEntity.addComponent(OneHandGrabbable, { translate: true, rotate: false });
    } else if (!on && proxyEntity.hasComponent(OneHandGrabbable)) {
      world.getSystem(GrabSystem)?.forceRelease(proxyEntity);
      proxyEntity.removeComponent(OneHandGrabbable);
    }
  }

  set(value);
  return { root, update, set, setActive, label: label.mesh, get value() { return state.value; } };
}
