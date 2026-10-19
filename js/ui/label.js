// Floating text panel drawn on a canvas texture.
// The texture is redrawn only when the text changes, and at most `maxHz` times
// a second (DESIGN.md budget: 10 Hz), so dragging does not re-upload every frame.
import * as THREE from 'three';

export function createLabel({ widthM = 0.42, heightM = 0.12, maxHz = 10 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round((1024 * heightM) / widthM);
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(widthM, heightM),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  mesh.renderOrder = 10;

  let drawn = '';
  let pending = null;
  let lastDraw = -Infinity;
  const minGapMs = 1000 / maxHz;

  // lines: [{ text, color?, size? (px), weight? }]
  function draw(lines) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(16,20,28,0.88)';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 40);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const total = lines.reduce((sum, l) => sum + (l.size ?? 64) * 1.3, 0);
    let y = (h - total) / 2;
    for (const l of lines) {
      const size = l.size ?? 64;
      y += (size * 1.3) / 2;
      ctx.font = `${l.weight ?? 700} ${size}px system-ui, sans-serif`;
      ctx.fillStyle = l.color ?? '#ffffff';
      ctx.fillText(l.text, w / 2, y);
      y += (size * 1.3) / 2;
    }
    texture.needsUpdate = true;
  }

  /** Request new text; drawn now or at the next allowed tick. */
  function setLines(lines, { force = false } = {}) {
    const key = JSON.stringify(lines);
    if (key === drawn && !pending) return;
    pending = { key, lines };
    if (force) flush(performance.now(), true);
  }

  /** Call once a frame. */
  function flush(now = performance.now(), force = false) {
    if (!pending) return;
    if (!force && now - lastDraw < minGapMs) return;
    if (pending.key !== drawn) draw(pending.lines);
    drawn = pending.key;
    pending = null;
    lastDraw = now;
  }

  return { mesh, setLines, flush };
}

/** Turn `mesh` about the vertical axis to face `target` (a world position). */
const tmp = new THREE.Vector3();
export function faceYaw(mesh, target) {
  mesh.getWorldPosition(tmp);
  const yaw = Math.atan2(target.x - tmp.x, target.z - tmp.z);
  mesh.rotation.set(0, yaw, 0);
}
