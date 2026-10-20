// The guided recording script. Each step shows a prompt, counts down 3 s, then
// runs for `reps` beeps spaced `period` seconds apart (one beep = one repetition)
// or for `seconds` of free/negative activity. Labels are written from this.

const sides = ['left', 'right'];
const perSide = (action, text, reps, period) =>
  sides.map((side) => ({ action, side, text: `${text}: ${side.toUpperCase()} leg`, reps, period, look: 'down' }));

export const PROTOCOL = [
  { action: 'still', side: 'none', text: 'Sit still, look straight ahead', seconds: 8, look: 'ahead' },
  { action: 'still', side: 'none', text: 'Look down at your knees, sit still', seconds: 10, look: 'down' },
  ...perSide('toe_tap', 'Toe taps (heel stays down)', 10, 1.5),
  ...perSide('heel_tap', 'Heel taps (toes stay down)', 10, 1.5),
  ...perSide('stomp', 'Stomps', 10, 1.5),
  ...perSide('knee_lift', 'Knee lifts', 8, 2),
  ...perSide('leg_swing', 'Kick forward and back down', 8, 2),
  ...perSide('leg_cross', 'Cross this leg over, then back', 5, 3),
  { action: 'march', side: 'both', text: 'March in place (alternate legs)', reps: 10, period: 1.5, look: 'down' },
  { action: 'heel_bounce', side: 'both', text: 'Both heels up and down', reps: 10, period: 1.5, look: 'down' },
  { action: 'toe_tap', side: 'left', text: 'Look AHEAD (not down): toe taps, LEFT leg', reps: 10, period: 1.5, look: 'ahead' },
  { action: 'neg_hands', side: 'none', text: 'Look down. Move your hands around your lap; legs still', seconds: 15, look: 'down' },
  { action: 'neg_head', side: 'none', text: 'Turn your head slowly left and right; legs still', seconds: 12, look: 'any' },
  { action: 'neg_nod', side: 'none', text: 'Nod slowly; legs still', seconds: 10, look: 'any' },
  { action: 'neg_shift', side: 'none', text: 'Shift around in your chair; feet stay put', seconds: 10, look: 'down' },
];

export const COUNTDOWN = 3;

export function stepDuration(step) {
  return step.seconds ?? step.reps * step.period + 0.5;
}

/** ?quick=1: a 20-second dry run (3 short steps) for testing the tool. */
export function getProtocol(search = location.search) {
  if (!new URLSearchParams(search).has('quick')) return PROTOCOL;
  return [PROTOCOL[0], PROTOCOL[2], PROTOCOL[PROTOCOL.length - 1]].map((s) =>
    s.reps ? { ...s, reps: 2 } : { ...s, seconds: 2 },
  );
}
