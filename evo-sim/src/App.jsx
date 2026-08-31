import { useEffect, useRef, useState } from "react";
import { useTheme, getThemePalette } from "./hooks/useTheme.js";
import { useSimulationLoop } from "./hooks/useSimulationLoop.js";
import { mulberry32 } from "./sim/rng.js";
import { DEFAULTS, CHART_HISTORY, PREY_BANDS } from "./sim/constants.js";
import { generateObstacles, randomFreeTile } from "./sim/obstacles.js";
import { makeRandomPrey, makeRandomPred } from "./sim/entities.js";
import { stepSimulation } from "./sim/simulation.js";
import { drawWorld } from "./render/drawWorld.js";
import { drawChart } from "./render/drawChart.js";
import Toolbar from "./components/Toolbar.jsx";
import CanvasView from "./components/CanvasView.jsx";
import PopulationChart from "./components/PopulationChart.jsx";
import ControlsPanel from "./components/ControlsPanel.jsx";

export default function App() {
  const { theme, setTheme } = useTheme();

  /* sliders / params */
  const [tickRate, setTickRate] = useState(DEFAULTS.tickRate);
  const [preyPerSpecies, setPreyPerSpecies] = useState(DEFAULTS.preyPerSpecies);
  const [initialFood, setInitialFood] = useState(DEFAULTS.initialFood);
  const [foodPerSpawn, setFoodPerSpawn] = useState(DEFAULTS.foodPerSpawn);
  const [spawnIntervalMs, setSpawnIntervalMs] = useState(DEFAULTS.spawnIntervalMs);
  const [baseTickDrain, setBaseTickDrain] = useState(DEFAULTS.baseTickDrain);
  const [moveCost, setMoveCost] = useState(DEFAULTS.moveCost);
  const [energyPerFood, setEnergyPerFood] = useState(DEFAULTS.energyPerFood);
  const [visionRadius, setVisionRadius] = useState(DEFAULTS.visionRadius);
  const [maxCreatures, setMaxCreatures] = useState(DEFAULTS.maxCreatures);
  const [speedMin, setSpeedMin] = useState(DEFAULTS.speedMin);
  const [speedMax, setSpeedMax] = useState(DEFAULTS.speedMax);
  const [mutationPct, setMutationPct] = useState(DEFAULTS.mutationPct);
  const [hungerGlobal, setHungerGlobal] = useState(DEFAULTS.hungerGlobal);
  const [seed, setSeed] = useState(0);

  const [startCarnivores, setStartCarnivores] = useState(DEFAULTS.startCarnivores);
  const [predatorSpeedMult, setPredatorSpeedMult] = useState(DEFAULTS.predatorSpeedMult);
  const [predatorVisionMult, setPredatorVisionMult] = useState(DEFAULTS.predatorVisionMult);
  const [energyPerKill, setEnergyPerKill] = useState(DEFAULTS.energyPerKill);
  const [predatorRestTicks, setPredatorRestTicks] = useState(DEFAULTS.predatorRestTicks);
  const [predatorMoveCostMult, setPredatorMoveCostMult] = useState(DEFAULTS.predatorMoveCostMult);
  const [predatorReproEnergy, setPredatorReproEnergy] = useState(DEFAULTS.predatorReproEnergy);
  const [predatorMaxSharePct, setPredatorMaxSharePct] = useState(DEFAULTS.predatorMaxSharePct);
  const [predatorEngageRadius, setPredatorEngageRadius] = useState(DEFAULTS.predatorEngageRadius);
  const [predatorHungerTriggerPct, setPredatorHungerTriggerPct] = useState(DEFAULTS.predatorHungerTriggerPct);

  const [camoBaseChance, setCamoBaseChance] = useState(DEFAULTS.camoBaseChance);
  const [camoTendencyScale, setCamoTendencyScale] = useState(DEFAULTS.camoTendencyScale);
  const [camoDuration, setCamoDuration] = useState(DEFAULTS.camoDuration);
  const [camoDrainMult, setCamoDrainMult] = useState(DEFAULTS.camoDrainMult);

  const [obstacleClusterCount, setObstacleClusterCount] = useState(DEFAULTS.obstacleClusterCount);
  const [obstacleClusterSize, setObstacleClusterSize] = useState(DEFAULTS.obstacleClusterSize);

  const [preyCamoMaxLevel, setPreyCamoMaxLevel] = useState(DEFAULTS.preyCamoMaxLevel);
  const [preyCamoStepPct, setPreyCamoStepPct] = useState(DEFAULTS.preyCamoStepPct);
  const [preyCamoMutateChance, setPreyCamoMutateChance] = useState(DEFAULTS.preyCamoMutateChance);

  const [stats, setStats] = useState({ pop: 0, preds: 0, food: 0, avgSpeed: 0, avgHunger: 0 });
  const [selected, setSelected] = useState(null);
  const hoverIndexRef = useRef(-1);

  /* world + chart history live in refs so the tick loop never depends on stale render closures */
  const worldRef = useRef({ prey: [], preds: [], food: new Set(), obstacles: new Set(), lastSpawn: 0 });
  const histRef = useRef({ prey: [], preds: [], food: [], ticks: [] });
  const canvasRef = useRef(null);
  const chartCanvasRef = useRef(null);
  const rngRef = useRef(mulberry32(Math.floor(Math.random() * 2 ** 31)));

  /* params object always current — read fresh by the tick loop every call */
  const paramsRef = useRef({});
  paramsRef.current = {
    spawnIntervalMs, foodPerSpawn, visionRadius, predatorVisionMult, energyPerFood,
    maxCreatures, moveCost, baseTickDrain, hungerGlobal, predatorMoveCostMult,
    predatorRestTicks, energyPerKill, predatorReproEnergy, predatorMaxSharePct,
    predatorEngageRadius, predatorHungerTriggerPct,
    speedMin, speedMax, mutationPct, predatorSpeedMult,
    camoBaseChance, camoTendencyScale, camoDuration, camoDrainMult,
    visionMin: DEFAULTS.visionMin, visionMax: DEFAULTS.visionMax,
    preyCamoMaxLevel, preyCamoStepPct, preyCamoMutateChance,
  };
  const tickRateRef = useRef(tickRate);
  tickRateRef.current = tickRate;

  const selectedIdRef = useRef(null);
  selectedIdRef.current = selected?.id ?? null;

  function draw() {
    drawWorld(canvasRef.current, getThemePalette(), worldRef.current, selectedIdRef.current);
  }
  function redrawChart() {
    drawChart(chartCanvasRef.current, getThemePalette(), histRef.current, hoverIndexRef.current);
  }

  function setStatsSummary() {
    const { prey, preds, food } = worldRef.current;
    const pop = prey.length;
    let avgSpeed = 0, avgHunger = 0;
    if (pop) {
      for (const c of prey) { avgSpeed += c.speed; avgHunger += c.hungerMult; }
      avgSpeed /= pop; avgHunger /= pop;
    }
    setStats({ pop, preds: preds.length, food: food.size, avgSpeed: +avgSpeed.toFixed(2), avgHunger: +avgHunger.toFixed(2) });
  }

  function pushHistoryAndRedraw(tickNo = 0) {
    const { prey, preds, food } = worldRef.current;
    const h = histRef.current;
    h.prey.push(prey.length);
    h.preds.push(preds.length);
    h.food.push(food.size);
    h.ticks.push(tickNo);
    if (h.prey.length > CHART_HISTORY) { h.prey.shift(); h.preds.shift(); h.food.shift(); h.ticks.shift(); }
    redrawChart();
  }

  function resetWorld(rngFn) {
    const world = { prey: [], preds: [], food: new Set(), obstacles: new Set(), lastSpawn: 0 };
    world.obstacles = generateObstacles(rngFn, obstacleClusterCount, obstacleClusterSize);

    for (let i = 0; i < initialFood; i++) {
      const { x, y } = randomFreeTile(rngFn, world.obstacles);
      world.food.add(`${x},${y}`);
    }
    for (const band of PREY_BANDS) {
      for (let i = 0; i < preyPerSpecies; i++) {
        const c = makeRandomPrey(rngFn, paramsRef.current, band);
        const tile = randomFreeTile(rngFn, world.obstacles);
        c.x = tile.x; c.y = tile.y;
        world.prey.push(c);
      }
    }
    for (let i = 0; i < startCarnivores; i++) {
      const c = makeRandomPred(rngFn, paramsRef.current);
      const tile = randomFreeTile(rngFn, world.obstacles);
      c.x = tile.x; c.y = tile.y;
      world.preds.push(c);
    }

    worldRef.current = world;
    histRef.current = { prey: [], preds: [], food: [], ticks: [] };
    setSelected(null);
    resetTickCount();
    setStatsSummary();
    pushHistoryAndRedraw(0);
    draw();
  }

  const { isRunning, tickCount, stop, toggleRun, resetTickCount } = useSimulationLoop({
    tickRateRef,
    onTick: (delta) => {
      stepSimulation(worldRef.current, paramsRef.current, delta, rngRef.current);
      draw();
    },
    onSample: (tickNo) => { setStatsSummary(); pushHistoryAndRedraw(tickNo); },
  });

  /* init + redraw on theme change */
  useEffect(() => {
    resetWorld(rngRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => { draw(); redrawChart(); };
    mql?.addEventListener?.("change", onChange);
    const obs = new MutationObserver(() => { draw(); redrawChart(); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mql?.removeEventListener?.("change", onChange);
      obs.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    stop();
    rngRef.current = mulberry32(seed || Math.floor(Math.random() * 2 ** 31));
    resetWorld(rngRef.current);
  };
  const handleReseed = () => {
    stop();
    const newSeed = Math.floor(Math.random() * 1e9);
    setSeed(newSeed);
    rngRef.current = mulberry32(newSeed);
    resetWorld(rngRef.current);
  };

  const sliderProps = {
    tickRate, setTickRate, preyPerSpecies, setPreyPerSpecies, initialFood, setInitialFood,
    foodPerSpawn, setFoodPerSpawn, spawnIntervalMs, setSpawnIntervalMs, baseTickDrain, setBaseTickDrain,
    moveCost, setMoveCost, hungerGlobal, setHungerGlobal, energyPerFood, setEnergyPerFood,
    predatorVisionMult, setPredatorVisionMult, predatorSpeedMult, setPredatorSpeedMult,
    predatorMoveCostMult, setPredatorMoveCostMult, energyPerKill, setEnergyPerKill,
    predatorRestTicks, setPredatorRestTicks, predatorReproEnergy, setPredatorReproEnergy,
    predatorMaxSharePct, setPredatorMaxSharePct, startCarnivores, setStartCarnivores,
    predatorEngageRadius, setPredatorEngageRadius, predatorHungerTriggerPct, setPredatorHungerTriggerPct,
    camoBaseChance, setCamoBaseChance, camoTendencyScale, setCamoTendencyScale,
    camoDuration, setCamoDuration, camoDrainMult, setCamoDrainMult,
    obstacleClusterCount, setObstacleClusterCount, obstacleClusterSize, setObstacleClusterSize,
    preyCamoMaxLevel, setPreyCamoMaxLevel, preyCamoStepPct, setPreyCamoStepPct,
    preyCamoMutateChance, setPreyCamoMutateChance,
    visionRadius, setVisionRadius, speedMin, setSpeedMin, speedMax, setSpeedMax,
    mutationPct, setMutationPct, maxCreatures, setMaxCreatures, seed, setSeed,
  };

  return (
    <div className="panel" style={{ maxWidth: 1320, margin: "16px auto" }}>
      <Toolbar theme={theme} setTheme={setTheme} />

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, marginTop: 12 }}>
        <CanvasView
          canvasRef={canvasRef}
          tickCount={tickCount}
          stats={stats}
          isRunning={isRunning}
          toggleRun={toggleRun}
          handleReset={handleReset}
          handleReseed={handleReseed}
          worldRef={worldRef}
          selected={selected}
          setSelected={setSelected}
        />

        <div className="panel">
          <PopulationChart
            chartCanvasRef={chartCanvasRef}
            histRef={histRef}
            onHoverIndex={(i) => { hoverIndexRef.current = i; redrawChart(); }}
          />
          <ControlsPanel p={sliderProps} />
        </div>
      </div>
    </div>
  );
}
