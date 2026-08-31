import { GRID_W, GRID_H, PREDATOR_BASE_ENERGY } from "./constants.js";
import { randomFreeTile } from "./obstacles.js";
import { SpatialGrid, buildTileOccupancy } from "./spatialGrid.js";
import { wrappedManhattan, attemptStep } from "./movement.js";
import { spawnChildPrey, spawnChildPred } from "./entities.js";

// Runs one simulation tick in place: mutates `world.prey`, `world.preds`,
// `world.food`, and `world.lastSpawn`.
//
// Performance note: nearest-predator (for prey) and nearest-prey (for
// predators) lookups are done via a SpatialGrid rebuilt fresh each tick
// for each population, rather than each entity scanning the entire
// opposing population. Build is O(N); each query only inspects nearby
// buckets, so the total tick cost scales ~O(N) instead of the O(N*M)
// full cross-scan the original single-file version did. See
// spatialGrid.js for details.
export function stepSimulation(world, params, deltaMs, rng) {
  const { prey, preds, food, obstacles } = world;

  // --- Food: cleared and re-scattered on a fixed timer (feast/famine) ---
  world.lastSpawn += deltaMs;
  if (world.lastSpawn >= params.spawnIntervalMs) {
    world.lastSpawn = 0;
    food.clear();
    for (let i = 0; i < params.foodPerSpawn; i++) {
      const { x, y } = randomFreeTile(rng, obstacles);
      food.add(`${x},${y}`);
    }
  }

  // Grid cell size is sized off the global baseline; per-entity vision
  // radii vary around it and queryNearest scales its bucket sweep to
  // whatever radius each individual actually passes in.
  const gridCell = Math.max(1, Math.floor(params.visionRadius));

  // Spatial index of (non-camouflaged) predators, for prey to detect.
  const visiblePreds = preds.filter((p) => p.camoTicksLeft <= 0);
  const predGrid = new SpatialGrid(gridCell, GRID_W, GRID_H);
  predGrid.build(visiblePreds);

  // --- PREY ---
  for (let i = prey.length - 1; i >= 0; i--) {
    const c = prey[i];
    const vr = Math.max(1, Math.floor(c.visionRadius));

    const nearestPred = predGrid.queryNearest(c.x, c.y, vr, wrappedManhattan);

    let targetFood = null, foodDist = Infinity;
    if (!nearestPred) {
      for (let yy = c.y - vr; yy <= c.y + vr; yy++) {
        for (let xx = c.x - vr; xx <= c.x + vr; xx++) {
          const wx = (xx + GRID_W) % GRID_W;
          const wy = (yy + GRID_H) % GRID_H;
          if (food.has(`${wx},${wy}`)) {
            const d = wrappedManhattan(c.x, c.y, wx, wy);
            if (d < foodDist) { foodDist = d; targetFood = { x: wx, y: wy }; }
          }
        }
      }
    }

    c.moveFrac += c.speed;
    let steps = 0;
    while (c.moveFrac >= 1) {
      c.moveFrac -= 1; steps++;
      const intent = nearestPred
        ? { away: { x: nearestPred.x, y: nearestPred.y } }
        : targetFood
        ? { toward: targetFood }
        : null;
      const moved = attemptStep(c.x, c.y, intent, obstacles, rng);
      c.x = moved.x; c.y = moved.y;

      const key = `${c.x},${c.y}`;
      if (food.has(key)) {
        food.delete(key);
        c.energy += params.energyPerFood;
        if (prey.length + preds.length < params.maxCreatures) {
          prey.push(spawnChildPrey(c, rng, params, obstacles));
        }
      }
    }
    c.energy -= (params.baseTickDrain * c.hungerMult * params.hungerGlobal) + steps * params.moveCost;
    if (c.energy <= 0) prey.splice(i, 1);
  }

  // --- PREDATORS ---
  const preyGrid = new SpatialGrid(gridCell, GRID_W, GRID_H);
  preyGrid.build(prey);
  const preyTileMap = buildTileOccupancy(prey);

  // Prey camouflage shrinks the range at which THIS prey is detectable,
  // and nothing else about it. Each level cuts the predator's effective
  // detection radius by preyCamoStepPct (e.g. a 4-tile-vision predator
  // vs a 25%-camo prey only spots it from 3 tiles).
  const detectableWithin = (predRadius, c) => {
    const reduction = (c.camoLevel || 0) * params.preyCamoStepPct;
    return Math.floor(predRadius * (1 - reduction));
  };

  const tryCatch = (p) => {
    const occupant = preyTileMap.get(`${p.x},${p.y}`);
    if (!occupant) return false;
    preyTileMap.delete(`${p.x},${p.y}`);
    const idx = prey.indexOf(occupant);
    if (idx !== -1) prey.splice(idx, 1);
    p.energy += params.energyPerKill;
    const totalAfter = prey.length + preds.length;
    const underShare = preds.length < Math.max(1, Math.floor((totalAfter * params.predatorMaxSharePct) / 100));
    if (p.energy >= params.predatorReproEnergy && underShare && totalAfter < params.maxCreatures) {
      preds.push(spawnChildPred(p, rng, params, obstacles));
      p.energy *= 0.85;
    }
    p.rest = Math.max(0, Math.floor(params.predatorRestTicks));
    return true;
  };

  for (let i = preds.length - 1; i >= 0; i--) {
    const p = preds[i];

    if (p.rest > 0) {
      p.rest -= 1;
      p.energy -= (params.baseTickDrain * p.hungerMult * params.hungerGlobal);
      if (p.energy <= 0) preds.splice(i, 1);
      continue;
    }

    if (p.camoTicksLeft > 0) {
      p.camoTicksLeft -= 1;
      tryCatch(p); // ambush: a prey that wanders onto the hidden tile still gets caught
      p.energy -= (params.baseTickDrain * p.hungerMult * params.hungerGlobal * params.camoDrainMult);
      if (p.energy <= 0) preds.splice(i, 1);
      continue;
    }

    const predVR = Math.max(1, Math.floor(p.visionRadius));
    const target = preyGrid.queryNearest(
      p.x, p.y, predVR, wrappedManhattan,
      (c, d) => d <= detectableWithin(predVR, c)
    );

    if (!target) {
      const camoChance = params.camoBaseChance + p.camoTendency * params.camoTendencyScale;
      if (rng() < camoChance) {
        p.camoTicksLeft = Math.max(1, Math.floor(params.camoDuration));
        tryCatch(p);
        p.energy -= (params.baseTickDrain * p.hungerMult * params.hungerGlobal * params.camoDrainMult);
        if (p.energy <= 0) preds.splice(i, 1);
        continue;
      }
    }

    // Lie in wait: a predator that spots prey doesn't chase unless the
    // prey is already close, or it's hungry enough to stop being picky.
    if (target) {
      const distToTarget = wrappedManhattan(p.x, p.y, target.x, target.y);
      const isHungry = p.energy <= params.predatorHungerTriggerPct * PREDATOR_BASE_ENERGY;
      const shouldEngage = distToTarget <= params.predatorEngageRadius || isHungry;
      if (!shouldEngage) {
        tryCatch(p); // still catches anything that wanders directly onto it
        p.energy -= (params.baseTickDrain * p.hungerMult * params.hungerGlobal);
        if (p.energy <= 0) preds.splice(i, 1);
        continue;
      }
    }

    p.moveFrac += p.speed;
    let steps = 0;

    while (p.moveFrac >= 1) {
      p.moveFrac -= 1; steps++;
      const intent = target ? { toward: { x: target.x, y: target.y } } : null;
      const moved = attemptStep(p.x, p.y, intent, obstacles, rng);
      p.x = moved.x; p.y = moved.y;

      if (tryCatch(p)) break;
    }

    p.energy -= (params.baseTickDrain * p.hungerMult * params.hungerGlobal) + steps * params.moveCost * params.predatorMoveCostMult;
    if (p.energy <= 0) preds.splice(i, 1);
  }

  // --- hard cap: cull oldest first ---
  let total = prey.length + preds.length;
  if (total > params.maxCreatures) {
    const needCull = total - params.maxCreatures;
    const cullPrey = Math.min(needCull, prey.length);
    prey.splice(0, cullPrey);
    total = prey.length + preds.length;
    if (total > params.maxCreatures) preds.splice(0, total - params.maxCreatures);
  }
}
