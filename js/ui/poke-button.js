// A desk button you press with a fingertip (PokeInteractable) or point at and
// pinch (RayInteractable). The cap sinks while pressed; onPress fires once per
// press. A button re-arms only after the finger or ray has left it (or after
// 1.5 s with no contact): one poke can produce two pointerdowns (down and back up), seen in
// IWSDK's emulator, and a time debounce alone let Next fire twice.
import { Hovered, Pressed, PokeInteractable, RayInteractable, createSystem } from '@iwsdk/core';
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
  buttons.set(entity, { cap, onPress, lastPress: 0, armed: true, pressedOffSince: null });
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
      if (!b.armed || now - b.lastPress < 350) return;
      b.armed = false;
      b.lastPress = now;
      sfx.press();
      b.onPress?.();
    });
  }

  update() {
    const now = performance.now();
    for (const [entity, b] of buttons) {
      const pressed = entity.hasComponent(Pressed);
      if (pressed) b.pressedOffSince = null;
      else b.pressedOffSince ??= now;
      // Re-arm once the finger/ray has left, or has stayed off the cap for 1.5 s
      // (a finger resting nearby can still press again deliberately).
      const offLongEnough = !pressed && now - b.pressedOffSince > 1500;
      if (!b.armed && (!entity.hasComponent(Hovered) || offLongEnough)) b.armed = true;
      const target = entity.hasComponent(Pressed) ? 0.009 : 0.015;
      b.cap.position.y += (target - b.cap.position.y) * 0.5;
    }
  }
}
