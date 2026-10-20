// Hand microgestures in Quest Browser: thumb swipes and taps against the side of
// the index finger, exposed as gamepad buttons on each hand input source
// (WebXR input profile "oculus-hand"; Quest Browser 38.1+). No permission needed.
// Left-hand button 4 is the system menu gesture and is never used.
export const MICROGESTURES = {
  5: 'swipe-left',
  6: 'swipe-right',
  7: 'swipe-forward',
  8: 'swipe-backward',
  9: 'thumb-tap',
};

const prev = new Map(); // "left:5" -> pressed

/**
 * Call once per frame with the XR session; calls onGesture({ hand, name, index })
 * on each button's press edge. Returns the number of hand gamepads seen.
 */
export function pollMicrogestures(session, onGesture) {
  if (!session) return 0;
  let pads = 0;
  for (const src of session.inputSources) {
    if (!src.hand || !src.gamepad) continue;
    pads += 1;
    for (const [idx, name] of Object.entries(MICROGESTURES)) {
      const pressed = !!src.gamepad.buttons[idx]?.pressed;
      const key = `${src.handedness}:${idx}`;
      if (pressed && !prev.get(key)) onGesture({ hand: src.handedness, name, index: Number(idx) });
      prev.set(key, pressed);
    }
  }
  return pads;
}
