// Spatial voices: one soft sine-plus-overtone tone per orbit, placed at the
// orbit with an HRTF panner so each note comes from where its circle spins.
let ctx = null;

export function unlock() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

export function createVoice() {
  let nodes = null;
  function build() {
    const osc = ctx.createOscillator();
    const over = ctx.createOscillator(); // a quiet octave above for warmth
    const overGain = ctx.createGain();
    const gain = ctx.createGain();
    const panner = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 0.5 });
    osc.type = 'sine';
    over.type = 'sine';
    overGain.gain.value = 0.18;
    gain.gain.value = 0;
    osc.connect(gain);
    over.connect(overGain).connect(gain);
    gain.connect(panner).connect(ctx.destination);
    osc.start();
    over.start();
    nodes = { osc, over, gain, panner };
  }
  return {
    set({ hz, gain, position }) {
      if (!ctx || ctx.state !== 'running') return;
      if (!nodes) build();
      const t = ctx.currentTime;
      nodes.osc.frequency.setTargetAtTime(hz, t, 0.04);
      nodes.over.frequency.setTargetAtTime(hz * 2, t, 0.04);
      nodes.gain.gain.setTargetAtTime(gain, t, 0.08);
      nodes.panner.positionX.setTargetAtTime(position.x, t, 0.02);
      nodes.panner.positionY.setTargetAtTime(position.y, t, 0.02);
      nodes.panner.positionZ.setTargetAtTime(position.z, t, 0.02);
    },
  };
}

export function updateListener(pos, quat) {
  if (!ctx || ctx.state !== 'running') return;
  const l = ctx.listener;
  // Forward and up vectors from the head quaternion.
  const { x, y, z, w } = quat;
  const fx = -(2 * (x * z + w * y));
  const fy = -(2 * (y * z - w * x));
  const fz = -(1 - 2 * (x * x + y * y));
  const ux = 2 * (x * y - w * z);
  const uy = 1 - 2 * (x * x + z * z);
  const uz = 2 * (y * z + w * x);
  const t = ctx.currentTime;
  if (l.positionX) {
    l.positionX.setTargetAtTime(pos.x, t, 0.02);
    l.positionY.setTargetAtTime(pos.y, t, 0.02);
    l.positionZ.setTargetAtTime(pos.z, t, 0.02);
    l.forwardX.setTargetAtTime(fx, t, 0.02);
    l.forwardY.setTargetAtTime(fy, t, 0.02);
    l.forwardZ.setTargetAtTime(fz, t, 0.02);
    l.upX.setTargetAtTime(ux, t, 0.02);
    l.upY.setTargetAtTime(uy, t, 0.02);
    l.upZ.setTargetAtTime(uz, t, 0.02);
  }
}
