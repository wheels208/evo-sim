import { GRID_W, GRID_H, BAND, PREY_BANDS } from "./constants.js";
import { clamp, choice, randomHueInBand, mutateHueWithinBands } from "./rng.js";
import { isObstacle } from "./obstacles.js";

const DIAG_DIRS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

// Picks a birth tile adjacent to the parent, skipping obstacle tiles.
// Falls back to the parent's own tile if every neighbor is blocked
// (rare — obstacle clusters are sparse relative to the map).
function pickBirthTile(parent, rng, obstacles) {
  const shuffled = [...DIAG_DIRS].sort(() => rng() - 0.5);
  for (const [dx, dy] of shuffled) {
    const nx = (parent.x + dx + GRID_W) % GRID_W;
    const ny = (parent.y + dy + GRID_H) % GRID_H;
    if (!isObstacle(obstacles, nx, ny)) return { x: nx, y: ny };
  }
  return { x: parent.x, y: parent.y };
}

export function makeRandomPrey(rngFn, params) {
  const { speedMin, speedMax } = params;
  const speed = speedMin + rngFn() * (speedMax - speedMin);
  const hungerMult = 0.7 + rngFn() * 0.6; // 0.7-1.3
  const colorBand = choice(rngFn, PREY_BANDS);
  const hue = randomHueInBand(rngFn, BAND[colorBand]);
  return {
    id: Math.floor(rngFn() * 2 ** 31),
    x: Math.floor(rngFn() * GRID_W),
    y: Math.floor(rngFn() * GRID_H),
    energy: 100,
    speed,
    hungerMult,
    hue,
    colorBand,
    moveFrac: 0,
  };
}

export function makeRandomPred(rngFn, params) {
  const { speedMin, speedMax, predatorSpeedMult } = params;
  const base = speedMin + rngFn() * (speedMax - speedMin);
  const speed = base * predatorSpeedMult;
  const hungerMult = 0.9 + rngFn() * 0.5; // slightly higher baseline
  const hue = rngFn() < 0.5
    ? randomHueInBand(rngFn, BAND.predRedA)
    : randomHueInBand(rngFn, BAND.predRedB);
  return {
    id: Math.floor(rngFn() * 2 ** 31),
    x: Math.floor(rngFn() * GRID_W),
    y: Math.floor(rngFn() * GRID_H),
    energy: 120,
    speed,
    hungerMult,
    hue,
    rest: 0,
    moveFrac: 0,
    camoTendency: rngFn(), // 0-1, heritable; spontaneous triggers come from camoBaseChance instead
    camoTicksLeft: 0,
  };
}

export function mutateTrait(v, min, max, mutationPct, rng) {
  return clamp(v * (1 + (rng() * 2 - 1) * mutationPct), min, max);
}

export function mutatePreyHue(hue, colorBand, mutationPct, rng) {
  return mutateHueWithinBands(hue, mutationPct, rng, [BAND[colorBand]]);
}

export function mutatePredHue(hue, mutationPct, rng) {
  return mutateHueWithinBands(hue, mutationPct, rng, [BAND.predRedA, BAND.predRedB]);
}

export function spawnChildPrey(parent, rng, params, obstacles) {
  const { speedMin, speedMax, mutationPct } = params;
  const { x: nx, y: ny } = pickBirthTile(parent, rng, obstacles);
  return {
    id: Math.floor(rng() * 2 ** 31),
    x: nx, y: ny, energy: 100,
    speed: mutateTrait(parent.speed, speedMin, speedMax, mutationPct, rng),
    hungerMult: mutateTrait(parent.hungerMult, 0.2, 3.0, mutationPct, rng),
    hue: mutatePreyHue(parent.hue, parent.colorBand, mutationPct, rng),
    colorBand: parent.colorBand,
    moveFrac: 0,
  };
}

export function spawnChildPred(parent, rng, params, obstacles) {
  const { speedMin, speedMax, mutationPct, predatorSpeedMult } = params;
  const { x: nx, y: ny } = pickBirthTile(parent, rng, obstacles);
  const baseSpeed = clamp(parent.speed / predatorSpeedMult, speedMin, speedMax);
  const mutatedBase = mutateTrait(baseSpeed, speedMin, speedMax, mutationPct, rng);
  return {
    id: Math.floor(rng() * 2 ** 31),
    x: nx, y: ny, energy: 120,
    speed: mutatedBase * predatorSpeedMult,
    hungerMult: mutateTrait(parent.hungerMult, 0.2, 3.0, mutationPct, rng),
    hue: mutatePredHue(parent.hue, mutationPct, rng),
    rest: 0,
    moveFrac: 0,
    camoTendency: mutateTrait(parent.camoTendency, 0, 1, mutationPct, rng),
    camoTicksLeft: 0,
  };
}
