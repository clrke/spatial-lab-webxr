// Tiny synthesized sounds (no audio files): grab, release, snap tick, press, success.
// The AudioContext is created on the first user gesture (the Enter VR press).
let ctx = null;

export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, { at = 0, dur = 0.08, type = 'sine', gain = 0.12 } = {}) {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  grab: () => tone(520, { dur: 0.07, type: 'triangle' }),
  release: () => tone(390, { dur: 0.07, type: 'triangle', gain: 0.08 }),
  tick: () => tone(1400, { dur: 0.03, type: 'square', gain: 0.03 }),
  press: () => tone(660, { dur: 0.06, type: 'square', gain: 0.05 }),
  success: () => {
    tone(523, { dur: 0.16 });
    tone(659, { at: 0.1, dur: 0.16 });
    tone(784, { at: 0.2, dur: 0.3 });
  },
};
