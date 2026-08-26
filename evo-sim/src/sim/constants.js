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
  preyGreen: [100, 140],
  preyBlue: [200, 240],
  preyPurple: [265, 290],
  preyPink: [310, 335],
  predRedA: [350, 360],
  predRedB: [0, 10],
};

export const PREY_BANDS = ["preyYellow", "preyGreen", "preyBlue", "preyPurple", "preyPink"];

export const DEFAULTS = {
  tickRate: 15,
  startCreatures: 150,
  initialFood: 300,
  foodPerSpawn: 50,
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

  // Camouflage ("lie in wait")
  camoBaseChance: 0.01, // flat per-tick chance even with zero tendency
  camoTendencyScale: 0.25, // additional chance contributed by camoTendency (0-1)
  camoDuration: 8, // ticks spent immobile/hidden once triggered
  camoDrainMult: 0.4, // energy drain multiplier while camouflaged

  // Obstacles
  obstacleClusterCount: 3,
  obstacleClusterSize: 5,
};
