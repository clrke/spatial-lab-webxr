// A desk button you press with a fingertip (PokeInteractable) or point at and
// pinch (RayInteractable). The cap sinks while pressed; onPress fires once per
// press, with a short debounce so a jittery fingertip cannot double-fire.
import { Pressed, PokeInteractable, RayInteractable, createSystem } from '@iwsdk/core';
import * as THREE from 'three';
import { sfx } from '../audio.js';
import { createLabel } from './label.js';

const buttons = new Map(); // entity -> { cap, onPress, lastPress }

export function createPokeButton(world, { text, position, onPress, color = 0x4f8cff }) {
  const group = new THREE.Group();
  group.position.copy(position);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.028, 0.008, 32),
    new THREE.MeshStandardMaterial({ color: 0x232a36, roughness: 0.7 }),
  );
  base.position.y = 0.004;
  group.add(base);

  // Cap: 4.4 cm across (DESIGN.md: buttons at least 3 cm).
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.014, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, emissive: color, emissiveIntensity: 0.15 }),
  );
  cap.position.y = 0.015;
  group.add(cap);

  const label = createLabel({ widthM: 0.09, heightM: 0.03 });
  label.setLines([{ text, size: 150 }], { force: true });
  label.mesh.position.set(0, 0.045, 0.0);
  label.mesh.rotation.x = -0.5; // tilted up toward a seated user
  group.add(label.mesh);

  // createTransformEntity re-parents to the level root unless given a parent
  // entity, so the cap is made a child entity of the button's own entity.
  const groupEntity = world.createTransformEntity(group);
  const entity = world.createTransformEntity(cap, groupEntity);
  entity.addComponent(PokeInteractable).addComponent(RayInteractable);
  buttons.set(entity, { cap, onPress, lastPress: 0 });
  return { group, entity };
}

export class PokeButtonSystem extends createSystem({
  pressed: { required: [PokeInteractable, Pressed] },
}) {
  init() {
    this.queries.pressed.subscribe('qualify', (entity) => {
      const b = buttons.get(entity);
      if (!b) return;
      const now = performance.now();
      if (now - b.lastPress < 350) return;
      b.lastPress = now;
      sfx.press();
      b.onPress?.();
    });
  }

  update() {
    for (const [entity, b] of buttons) {
      const target = entity.hasComponent(Pressed) ? 0.009 : 0.015;
      b.cap.position.y += (target - b.cap.position.y) * 0.5;
    }
  }
}
