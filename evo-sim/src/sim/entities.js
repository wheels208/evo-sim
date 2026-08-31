import { GRID_W, GRID_H, BAND, PREY_BANDS, PREDATOR_BASE_ENERGY } from "./constants.js";
import { clamp, choice, randomHueInBand, mutateHueWithinBands } from "./rng.js";
import { isObstacle } from "./obstacles.js";

const DIAG_DIRS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

// How many recent ancestors each entity carries, on top of its permanent
// gen-0 founder snapshot. Kept small and fixed on purpose: a full
// ancestry chain would mean copying an ever-growing array on every
// birth, which would reintroduce per-birth cost that scales with
// generation count and undo the O(n) tick budget.
const ANCESTRY_DEPTH = 3;

export function snapshotOf(e) {
  return {
    generation: e.generation,
    speed: e.speed,
    hungerMult: e.hungerMult,
    visionRadius: e.visionRadius,
    camoLevel: e.camoLevel ?? 0,
    camoTendency: e.camoTendency,
  };
}

// Founder snapshot is shared by reference down the whole line (it's
// never mutated), so this stays O(ANCESTRY_DEPTH), not O(generations).
function descendAncestry(parent) {
  return {
    founder: parent.ancestry.founder,
    recent: [...parent.ancestry.recent, snapshotOf(parent)].slice(-ANCESTRY_DEPTH),
  };
}

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

export function makeRandomPrey(rngFn, params, band) {
  const { speedMin, speedMax, visionRadius, visionMin, visionMax, preyCamoMaxLevel } = params;
  const speed = speedMin + rngFn() * (speedMax - speedMin);
  const hungerMult = 0.7 + rngFn() * 0.6; // 0.7-1.3
  const colorBand = band || choice(rngFn, PREY_BANDS);
  const hue = randomHueInBand(rngFn, BAND[colorBand]);
  const prey = {
    id: Math.floor(rngFn() * 2 ** 31),
    x: Math.floor(rngFn() * GRID_W),
    y: Math.floor(rngFn() * GRID_H),
    energy: 100,
    speed,
    hungerMult,
    visionRadius: clamp(visionRadius * (0.8 + rngFn() * 0.4), visionMin, visionMax),
    camoLevel: Math.floor(rngFn() * (preyCamoMaxLevel + 1)),
    hue,
    colorBand,
    moveFrac: 0,
    generation: 0,
  };
  prey.ancestry = { founder: snapshotOf(prey), recent: [] };
  return prey;
}

export function makeRandomPred(rngFn, params) {
  const { speedMin, speedMax, predatorSpeedMult, visionRadius, predatorVisionMult, visionMin, visionMax } = params;
  const base = speedMin + rngFn() * (speedMax - speedMin);
  const speed = base * predatorSpeedMult;
  const hungerMult = 0.9 + rngFn() * 0.5; // slightly higher baseline
  const hue = rngFn() < 0.5
    ? randomHueInBand(rngFn, BAND.predRedA)
    : randomHueInBand(rngFn, BAND.predRedB);
  const pred = {
    id: Math.floor(rngFn() * 2 ** 31),
    x: Math.floor(rngFn() * GRID_W),
    y: Math.floor(rngFn() * GRID_H),
    energy: PREDATOR_BASE_ENERGY,
    speed,
    hungerMult,
    visionRadius: clamp(visionRadius * predatorVisionMult * (0.8 + rngFn() * 0.4), visionMin, visionMax),
    hue,
    rest: 0,
    moveFrac: 0,
    camoTendency: rngFn(), // 0-1, heritable; spontaneous triggers come from camoBaseChance instead
    camoTicksLeft: 0,
    generation: 0,
  };
  pred.ancestry = { founder: snapshotOf(pred), recent: [] };
  return pred;
}

export function mutateTrait(v, min, max, mutationPct, rng) {
  return clamp(v * (1 + (rng() * 2 - 1) * mutationPct), min, max);
}

// Camo level is a small integer, so it drifts by whole steps rather
// than the proportional nudge used for continuous traits.
function mutateCamoLevel(level, params, rng) {
  const { preyCamoMaxLevel, preyCamoMutateChance } = params;
  if (rng() >= preyCamoMutateChance) return level;
  const step = rng() < 0.5 ? -1 : 1;
  return clamp(level + step, 0, preyCamoMaxLevel);
}

export function mutatePreyHue(hue, colorBand, mutationPct, rng) {
  return mutateHueWithinBands(hue, mutationPct, rng, [BAND[colorBand]]);
}

export function mutatePredHue(hue, mutationPct, rng) {
  return mutateHueWithinBands(hue, mutationPct, rng, [BAND.predRedA, BAND.predRedB]);
}

export function spawnChildPrey(parent, rng, params, obstacles) {
  const { speedMin, speedMax, mutationPct, visionMin, visionMax } = params;
  const { x: nx, y: ny } = pickBirthTile(parent, rng, obstacles);
  return {
    id: Math.floor(rng() * 2 ** 31),
    x: nx, y: ny, energy: 100,
    speed: mutateTrait(parent.speed, speedMin, speedMax, mutationPct, rng),
    hungerMult: mutateTrait(parent.hungerMult, 0.2, 3.0, mutationPct, rng),
    visionRadius: mutateTrait(parent.visionRadius, visionMin, visionMax, mutationPct, rng),
    camoLevel: mutateCamoLevel(parent.camoLevel, params, rng),
    hue: mutatePreyHue(parent.hue, parent.colorBand, mutationPct, rng),
    colorBand: parent.colorBand,
    moveFrac: 0,
    generation: parent.generation + 1,
    ancestry: descendAncestry(parent),
  };
}

export function spawnChildPred(parent, rng, params, obstacles) {
  const { speedMin, speedMax, mutationPct, predatorSpeedMult, visionMin, visionMax } = params;
  const { x: nx, y: ny } = pickBirthTile(parent, rng, obstacles);
  const baseSpeed = clamp(parent.speed / predatorSpeedMult, speedMin, speedMax);
  const mutatedBase = mutateTrait(baseSpeed, speedMin, speedMax, mutationPct, rng);
  return {
    id: Math.floor(rng() * 2 ** 31),
    x: nx, y: ny, energy: PREDATOR_BASE_ENERGY,
    speed: mutatedBase * predatorSpeedMult,
    hungerMult: mutateTrait(parent.hungerMult, 0.2, 3.0, mutationPct, rng),
    visionRadius: mutateTrait(parent.visionRadius, visionMin, visionMax, mutationPct, rng),
    hue: mutatePredHue(parent.hue, mutationPct, rng),
    rest: 0,
    moveFrac: 0,
    camoTendency: mutateTrait(parent.camoTendency, 0, 1, mutationPct, rng),
    camoTicksLeft: 0,
    generation: parent.generation + 1,
    ancestry: descendAncestry(parent),
  };
}
