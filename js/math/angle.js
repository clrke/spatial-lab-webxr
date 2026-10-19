// Pure angle helpers for the trigonometry lessons (no three.js, no DOM).

export const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;

/** Normalise an angle to [0, 2π). */
export function wrapPositive(rad) {
  const r = rad % TAU;
  return r < 0 ? r + TAU : r;
}

/** Normalise an angle difference to (-π, π]. */
export function wrapDelta(rad) {
  let d = rad % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

export const toDegrees = (rad) => rad * DEG;

/**
 * Snap to the nearest multiple of `stepDeg` when within `withinDeg` of it,
 * so the "nice" angles (30°, 45°, 90°...) are easy to hit by hand.
 */
export function snapAngle(rad, stepDeg = 15, withinDeg = 1.5) {
  const deg = toDegrees(wrapPositive(rad));
  const nearest = Math.round(deg / stepDeg) * stepDeg;
  if (Math.abs(deg - nearest) <= withinDeg) return wrapPositive(nearest / DEG);
  return wrapPositive(rad);
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Radians as a fraction of π ("3π/4") when the angle is a whole number of
 * degrees that is a multiple of 15; otherwise null.
 */
export function piFraction(rad) {
  const deg = (Math.round(toDegrees(wrapPositive(rad)) * 1000) / 1000) % 360;
  if (!Number.isInteger(deg) || deg % 15 !== 0) return null;
  if (deg === 0) return '0';
  const g = gcd(deg, 180);
  const num = deg / g;
  const den = 180 / g;
  const top = num === 1 ? 'π' : `${num}π`;
  return den === 1 ? top : `${top}/${den}`;
}

/** sin, cos and tan of an angle; tan is null where it is undefined (cos ≈ 0). */
export function trigValues(rad) {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  return {
    sin: Math.abs(s) < 1e-9 ? 0 : s,
    cos: Math.abs(c) < 1e-9 ? 0 : c,
    tan: Math.abs(c) < 0.01 ? null : s / c,
  };
}

/** Format a value with a real minus sign and fixed decimals ("−0.71"). */
export function fmt(v, digits = 2) {
  const t = Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v;
  return t.toFixed(digits).replace('-', '−');
}
