export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const choice = (rand, arr) => arr[Math.floor(rand() * arr.length)];

export function randomHueInBand(rng, [lo, hi]) {
  if (lo <= hi) return lo + rng() * (hi - lo);
  const span = 360 - lo + hi;
  const t = rng() * span;
  return (lo + t) % 360;
}

export function clampHueToBands(h, bands) {
  const inBand = (h, [lo, hi]) => (lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi);
  for (const b of bands) if (inBand(h, b)) return ((h % 360) + 360) % 360;
  let best = { diff: 1e9, hue: h };
  const edges = bands.flatMap(([lo, hi]) => [lo, hi]);
  for (const e of edges) {
    const d = Math.min(Math.abs(h - e), 360 - Math.abs(h - e));
    if (d < best.diff) best = { diff: d, hue: e };
  }
  return ((best.hue % 360) + 360) % 360;
}

export function mutateHueWithinBands(h, pct, rng, bands) {
  const delta = (rng() * 2 - 1) * 360 * pct;
  return clampHueToBands(h + delta, bands);
}
