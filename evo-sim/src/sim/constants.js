export const GRID_W = 100;
export const GRID_H = 100;
export const CELL_SIZE = 6;
export const CANVAS_W = GRID_W * CELL_SIZE;
export const CANVAS_H = GRID_H * CELL_SIZE;

export const CHART_W = 520;
export const CHART_H = 160;
export const CHART_HISTORY = 400; // points kept

// Prey hues are grouped into bands so a lineage's color stays visually
// traceable across generations (mutation nudges hue but clampHueToBands
// keeps it inside its home band). Bands are spaced to avoid the red
// bands reserved for predators.
export const BAND = {
  preyYellow: [45, 65],
  // Kept clear of food's fixed neon-green hue (~110deg, #39FF14) so
  // green-lineage prey don't read as food dots at a glance.
  preyGreen: [155, 178],
  preyBlue: [200, 240],
  preyPurple: [265, 290],
  preyPink: [310, 335],
  predRedA: [350, 360],
  predRedB: [0, 10],
};

export const PREY_BANDS = ["preyYellow", "preyGreen", "preyBlue", "preyPurple", "preyPink"];

// Baseline spawn energy for predators — used both when creating one and
// as the 100% reference point for the hunger-trigger threshold below.
export const PREDATOR_BASE_ENERGY = 120;

export const DEFAULTS = {
  tickRate: 15,
  preyPerSpecies: 3, // spawned per color band at reset (5 bands)
  // Scaled down 10x alongside the prey count cut (was 150 prey / 300
  // food / 50 per spawn) to keep the same per-capita food economy —
  // scaling prey count down without scaling food down caused runaway
  // reproduction instead of the intended smaller, steadier population.
  initialFood: 30,
  foodPerSpawn: 5,
  spawnIntervalMs: 1000,
  baseTickDrain: 1.0,
  moveCost: 0.2,
  energyPerFood: 60,
  visionRadius: 10,
  maxCreatures: 5000,
  speedMin: 0.5,
  speedMax: 3.0,
  mutationPct: 0.05,
  hungerGlobal: 1.0,

  // Carnivores
  startCarnivores: 8,
  predatorSpeedMult: 1.2,
  predatorVisionMult: 1.1,
  energyPerKill: 140,
  predatorRestTicks: 12,
  predatorMoveCostMult: 1.3,
  predatorReproEnergy: 200,
  predatorMaxSharePct: 40,
  predatorEngageRadius: 2, // only chase prey this close...
  predatorHungerTriggerPct: 0.25, // ...unless energy has dropped to this fraction of PREDATOR_BASE_ENERGY

  // Camouflage ("lie in wait")
  camoBaseChance: 0.01, // flat per-tick chance even with zero tendency
  camoTendencyScale: 0.25, // additional chance contributed by camoTendency (0-1)
  camoDuration: 30, // ticks spent immobile/hidden once triggered — long enough for prey to wander into range
  camoDrainMult: 0.4, // energy drain multiplier while camouflaged

  // Obstacles
  obstacleClusterCount: 3,
  obstacleClusterSize: 5,
};
