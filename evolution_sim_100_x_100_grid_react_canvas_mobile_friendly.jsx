import React, { useEffect, useMemo, useRef, useState } from "react";

/* -------------------- Tiny CSS (injected once) -------------------- */
const THEME_CSS = `
:root{
  --bg:#ffffff; --panel:#f6f7f9; --text:#0a0a0a; --muted:#5b5f66;
  --accent:#3b82f6; --border:#d9dbe1; --shadow:0 6px 24px rgba(0,0,0,.08)
}
:root[data-theme="dark"]{
  --bg:#0b0f14; --panel:#111821; --text:#e8edf3; --muted:#a7b0bd;
  --accent:#60a5fa; --border:#1f2a36; --shadow:0 6px 24px rgba(0,0,0,.4)
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]):not([data-theme="dark"]){
    --bg:#0b0f14; --panel:#111821; --text:#e8edf3; --muted:#a7b0bd;
    --accent:#60a5fa; --border:#1f2a36; --shadow:0 6px 24px rgba(0,0,0,.4)
  }
}
html,body{background:var(--bg);color:var(--text)}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);padding:12px}
.controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.label{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted);margin:4px 0}
input[type="range"]{width:100%;appearance:none;height:4px;background:linear-gradient(to right,var(--accent),var(--accent)) left/0% 100% no-repeat,var(--border);border-radius:999px;outline:none}
input[type="range"]::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid var(--panel);cursor:pointer}
input[type="range"]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid var(--panel);cursor:pointer}
.btn{background:var(--accent);color:#fff;border:0;border-radius:10px;padding:8px 12px;cursor:pointer}
.btn.ghost{background:transparent;color:var(--text);border:1px solid var(--border)}
.toolbar{display:flex;gap:8px;flex-wrap:wrap}
.canvas-wrap{position:relative;display:inline-block}
.overlay{position:absolute;left:8px;top:8px;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;color:var(--text);
  background:color-mix(in srgb,var(--panel) 82%, transparent);border:1px solid var(--border);border-radius:8px;padding:6px 8px;backdrop-filter:blur(6px)}
.chart-wrap{position:relative}
.chart-legend{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--muted)}
.dot{width:10px;height:10px;border-radius:50%}
`;

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "");
  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
    localStorage.setItem("theme", theme);
  }, [theme]);
  return { theme, setTheme };
}
function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function getThemePalette() {
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark" ||
    (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches &&
      !document.documentElement.hasAttribute("data-theme"));
  return {
    isDark,
    bg: isDark ? "#0b0f14" : "#ffffff",
    gridMinor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
    gridMajor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
    food: "#39FF14", // neon green
    preyStroke: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.65)",
    predStroke: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.45)",
    text: getCssVar("--text") || (isDark ? "#e8edf3" : "#0a0a0a"),
    chartAxis: isDark ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.35)",
    chartGrid: isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)",
    chartPrey: isDark ? "#60a5fa" : "#2563eb",    // blue
    chartPred: isDark ? "#f87171" : "#dc2626",    // red
    chartFood: isDark ? "#22c55e" : "#16a34a",    // green
  };
}

/* ---- RNG / utils ---- */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const choice = (rand, arr) => arr[Math.floor(rand() * arr.length)];

/* ---- Color bands (hue) ---- */
const BAND = {
  preyYellow: [45, 65],
  preyBlue:   [200, 240],
  predRedA:   [350, 360],
  predRedB:   [0, 10],
};
function randomHueInBand(rng, [lo, hi]) {
  if (lo <= hi) return lo + rng() * (hi - lo);
  const span = (360 - lo) + hi;
  const t = rng() * span;
  return (lo + t) % 360;
}
function clampHueToBands(h, bands) {
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
function mutateHueWithinBands(h, pct, rng, bands) {
  const delta = (rng() * 2 - 1) * 360 * pct;
  return clampHueToBands(h + delta, bands);
}

/* ---- World constants ---- */
const GRID_W = 100;
const GRID_H = 100;
const CELL_SIZE = 6;
const CANVAS_W = GRID_W * CELL_SIZE;
const CANVAS_H = GRID_H * CELL_SIZE;

const CHART_W = 520;
const CHART_H = 160;
const CHART_HISTORY = 400; // points kept

const DEFAULTS = {
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

  // Carnivores (rebalanced defaults)
  startCarnivores: 8,
  predatorSpeedMult: 1.2,        // slight nerf from 1.25
  predatorVisionMult: 1.1,       // see a bit farther, but not too far
  energyPerKill: 140,            // down from 180
  predatorRestTicks: 12,         // up from 8 (more downtime)
  predatorMoveCostMult: 1.3,     // NEW: preds pay more per move
  predatorReproEnergy: 200,      // NEW: must have >= this energy to reproduce
  predatorMaxSharePct: 40,       // NEW: cap predators at % of total population
};

export default function EvolutionSim() {
  /* inject CSS once */
  useEffect(() => {
    if (!document.getElementById("evo-theme-css")) {
      const tag = document.createElement("style");
      tag.id = "evo-theme-css";
      tag.textContent = THEME_CSS;
      document.head.appendChild(tag);
    }
  }, []);

  const { theme, setTheme } = useTheme();

  /* sliders / params */
  const [tickRate, setTickRate] = useState(DEFAULTS.tickRate);
  const [startCreatures, setStartCreatures] = useState(DEFAULTS.startCreatures);
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

  // Pred controls (incl. new ones)
  const [startCarnivores, setStartCarnivores] = useState(DEFAULTS.startCarnivores);
  const [predatorSpeedMult, setPredatorSpeedMult] = useState(DEFAULTS.predatorSpeedMult);
  const [predatorVisionMult, setPredatorVisionMult] = useState(DEFAULTS.predatorVisionMult);
  const [energyPerKill, setEnergyPerKill] = useState(DEFAULTS.energyPerKill);
  const [predatorRestTicks, setPredatorRestTicks] = useState(DEFAULTS.predatorRestTicks);
  const [predatorMoveCostMult, setPredatorMoveCostMult] = useState(DEFAULTS.predatorMoveCostMult);
  const [predatorReproEnergy, setPredatorReproEnergy] = useState(DEFAULTS.predatorReproEnergy);
  const [predatorMaxSharePct, setPredatorMaxSharePct] = useState(DEFAULTS.predatorMaxSharePct);

  const [isRunning, setIsRunning] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const [stats, setStats] = useState({ pop: 0, preds: 0, food: 0, avgSpeed: 0, avgHunger: 0 });

  // chart history
  const histPreyRef = useRef([]);
  const histPredRef = useRef([]);
  const histFoodRef = useRef([]);
  const chartCanvasRef = useRef(null);

  const rng = useMemo(() => mulberry32(seed || Math.floor(Math.random() * 2 ** 31)), [seed]);

  /* state refs for sim loop */
  const preyRef = useRef([]);        // normal creatures
  const predsRef = useRef([]);       // carnivores
  const foodRef = useRef(new Set()); // Set of "x,y"
  const lastSpawnRef = useRef(0);
  const intervalIdRef = useRef(null);
  const canvasRef = useRef(null);

  /* init + cleanup */
  useEffect(() => {
    resetWorld(false);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* re-draw when theme changes */
  useEffect(() => {
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => { draw(); drawChart(); };
    mql?.addEventListener?.("change", onChange);
    const obs = new MutationObserver(() => { draw(); drawChart(); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mql?.removeEventListener?.("change", onChange);
      obs.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- entity factories ---- */
  function makeRandomPrey(rngFn) {
    const speed = speedMin + rngFn() * (speedMax - speedMin);
    const hungerMult = 0.7 + rngFn() * 0.6; // 0.7–1.3
    const bandChoice = rngFn() < 0.5 ? "yellow" : "blue";
    const hue = bandChoice === "yellow"
      ? randomHueInBand(rngFn, BAND.preyYellow)
      : randomHueInBand(rngFn, BAND.preyBlue);
    return {
      id: Math.floor(rngFn() * 2 ** 31),
      x: Math.floor(rngFn() * GRID_W),
      y: Math.floor(rngFn() * GRID_H),
      energy: 100,
      speed,
      hungerMult,
      hue,
      colorBand: bandChoice, // "yellow" | "blue"
      moveFrac: 0,
    };
  }
  function makeRandomPred(rngFn) {
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
    };
  }
  const mutateTrait = (v, min, max) => clamp(v * (1 + (rng() * 2 - 1) * mutationPct), min, max);
  const mutatePreyHue = (c) =>
    mutateHueWithinBands(c.hue, mutationPct, rng, c.colorBand === "yellow" ? [BAND.preyYellow] : [BAND.preyBlue]);
  const mutatePredHue = (h) =>
    mutateHueWithinBands(h, mutationPct, rng, [BAND.predRedA, BAND.predRedB]);

  function spawnChildPrey(parent) {
    const dirs = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    const [dx, dy] = choice(rng, dirs);
    const nx = (parent.x + dx + GRID_W) % GRID_W;
    const ny = (parent.y + dy + GRID_H) % GRID_H;
    preyRef.current.push({
      id: Math.floor(rng() * 2 ** 31),
      x: nx, y: ny, energy: 100,
      speed: mutateTrait(parent.speed, speedMin, speedMax),
      hungerMult: mutateTrait(parent.hungerMult, 0.2, 3.0),
      hue: mutatePreyHue(parent),
      colorBand: parent.colorBand,
      moveFrac: 0,
    });
  }
  function spawnChildPred(parent) {
    const dirs = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    const [dx, dy] = choice(rng, dirs);
    const nx = (parent.x + dx + GRID_W) % GRID_W;
    const ny = (parent.y + dy + GRID_H) % GRID_H;
    const baseSpeed = clamp(parent.speed / predatorSpeedMult, speedMin, speedMax);
    const mutatedBase = mutateTrait(baseSpeed, speedMin, speedMax);
    predsRef.current.push({
      id: Math.floor(rng() * 2 ** 31),
      x: nx, y: ny, energy: 120,
      speed: mutatedBase * predatorSpeedMult,
      hungerMult: mutateTrait(parent.hungerMult, 0.2, 3.0),
      hue: mutatePredHue(parent.hue),
      rest: 0,
      moveFrac: 0,
    });
  }

  /* ---- world reset ---- */
  function resetWorld(reseed) {
    if (reseed) setSeed((s) => (s === 0 ? 1 : 0) + Math.floor(Math.random() * 1e9));
    preyRef.current = [];
    predsRef.current = [];
    foodRef.current = new Set();
    lastSpawnRef.current = 0;
    setTickCount(0);

    histPreyRef.current = [];
    histPredRef.current = [];
    histFoodRef.current = [];

    for (let i = 0; i < initialFood; i++) {
      const x = Math.floor(rng() * GRID_W);
      const y = Math.floor(rng() * GRID_H);
      foodRef.current.add(`${x},${y}`);
    }
    for (let i = 0; i < startCreatures; i++) preyRef.current.push(makeRandomPrey(rng));
    for (let i = 0; i < startCarnivores; i++) predsRef.current.push(makeRandomPred(rng));

    setStatsSummary();
    pushHistoryAndRedraw();
    draw();
  }

  /* ---- helpers ---- */
  function wrappedManhattan(ax, ay, bx, by) {
    const dx = Math.min(Math.abs(ax - bx), GRID_W - Math.abs(ax - bx));
    const dy = Math.min(Math.abs(ay - by), GRID_H - Math.abs(ay - by));
    return dx + dy;
  }

  /* ---- sim step ---- */
  function stepSimulation(deltaMs) {
    const prey = preyRef.current;
    const preds = predsRef.current;
    const food = foodRef.current;

    // Food spawn: REPLACE all old food each interval
    lastSpawnRef.current += deltaMs;
    if (lastSpawnRef.current >= spawnIntervalMs) {
      lastSpawnRef.current = 0;
      food.clear(); // <--- despawn old food
      for (let i = 0; i < foodPerSpawn; i++) {
        const x = Math.floor(rng() * GRID_W);
        const y = Math.floor(rng() * GRID_H);
        food.add(`${x},${y}`);
      }
    }

    // PREY
    for (let i = prey.length - 1; i >= 0; i--) {
      const c = prey[i];
      const vr = Math.floor(visionRadius);
      let nearestPred = null, predDist = Infinity;
      if (preds.length) {
        for (const p of preds) {
          const d = wrappedManhattan(c.x, c.y, p.x, p.y);
          if (d <= vr && d < predDist) { predDist = d; nearestPred = p; }
        }
      }
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
        if (nearestPred) {
          const dx0 = (c.x - nearestPred.x + GRID_W) % GRID_W;
          const dy0 = (c.y - nearestPred.y + GRID_H) % GRID_H;
          const sx = dx0 === 0 ? 0 : dx0 <= GRID_W / 2 ? 1 : -1;
          const sy = dy0 === 0 ? 0 : dy0 <= GRID_H / 2 ? 1 : -1;
          const ax = Math.min(Math.abs(dx0), GRID_W - Math.abs(dx0));
          const ay = Math.min(Math.abs(dy0), GRID_H - Math.abs(dy0));
          if (ax >= ay) c.x = (c.x + sx + GRID_W) % GRID_W;
          else c.y = (c.y + sy + GRID_H) % GRID_H;
        } else if (targetFood) {
          const dx0 = (targetFood.x - c.x + GRID_W) % GRID_W;
          const dy0 = (targetFood.y - c.y + GRID_H) % GRID_H;
          const sx = dx0 === 0 ? 0 : dx0 <= GRID_W / 2 ? 1 : -1;
          const sy = dy0 === 0 ? 0 : dy0 <= GRID_H / 2 ? 1 : -1;
          const ax = Math.min(Math.abs(dx0), GRID_W - Math.abs(dx0));
          const ay = Math.min(Math.abs(dy0), GRID_H - Math.abs(dy0));
          if (ax >= ay) c.x = (c.x + sx + GRID_W) % GRID_W;
          else c.y = (c.y + sy + GRID_H) % GRID_H;
        } else {
          const [dx, dy] = choice(rng, [[1,0],[-1,0],[0,1],[0,-1]]);
          c.x = (c.x + dx + GRID_W) % GRID_W;
          c.y = (c.y + dy + GRID_H) % GRID_H;
        }
        const key = `${c.x},${c.y}`;
        if (food.has(key)) {
          food.delete(key);
          c.energy += energyPerFood;
          if (prey.length + preds.length < maxCreatures) spawnChildPrey(c);
        }
      }
      c.energy -= (baseTickDrain * c.hungerMult * hungerGlobal) + steps * moveCost;
      if (c.energy <= 0) prey.splice(i, 1);
    }

    // PREDATORS
    const predVR = Math.max(1, Math.floor(visionRadius * predatorVisionMult));
    const maxPredsAllowed = Math.floor(((prey.length + preds.length) * predatorMaxSharePct) / 100);
    for (let i = preds.length - 1; i >= 0; i--) {
      const p = preds[i];
      if (p.rest && p.rest > 0) {
        p.rest -= 1;
        p.energy -= (baseTickDrain * p.hungerMult * hungerGlobal);
        if (p.energy <= 0) { preds.splice(i, 1); }
        continue;
      }

      let target = null, best = Infinity;
      for (const c of prey) {
        const d = wrappedManhattan(p.x, p.y, c.x, c.y);
        if (d <= predVR && d < best) { best = d; target = c; }
      }

      p.moveFrac += p.speed;
      let steps = 0, killed = false;

      while (p.moveFrac >= 1) {
        p.moveFrac -= 1; steps++;
        if (target) {
          const dx0 = (target.x - p.x + GRID_W) % GRID_W;
          const dy0 = (target.y - p.y + GRID_H) % GRID_H;
          const sx = dx0 === 0 ? 0 : dx0 <= GRID_W / 2 ? 1 : -1;
          const sy = dy0 === 0 ? 0 : dy0 <= GRID_H / 2 ? 1 : -1;
          const ax = Math.min(Math.abs(dx0), GRID_W - Math.abs(dx0));
          const ay = Math.min(Math.abs(dy0), GRID_H - Math.abs(dy0));
          if (ax >= ay) p.x = (p.x + sx + GRID_W) % GRID_W;
          else p.y = (p.y + sy + GRID_H) % GRID_H;
        } else {
          const [dx, dy] = choice(rng, [[1,0],[-1,0],[0,1],[0,-1]]);
          p.x = (p.x + dx + GRID_W) % GRID_W;
          p.y = (p.y + dy + GRID_H) % GRID_H;
        }

        // catch prey (same tile)
        for (let j = prey.length - 1; j >= 0; j--) {
          const c = prey[j];
          if (c.x === p.x && c.y === p.y) {
            prey.splice(j, 1);
            p.energy += energyPerKill;
            // reproduce only if energy threshold AND predator share under cap
            const totalAfter = prey.length + preds.length;
            const underShare = preds.length < Math.max(1, Math.floor((totalAfter * predatorMaxSharePct) / 100));
            if (p.energy >= predatorReproEnergy && underShare && totalAfter < maxCreatures) {
              spawnChildPred(p);
              // small reproduction cost to parent to avoid runaway
              p.energy *= 0.85;
            }
            p.rest = Math.max(0, Math.floor(predatorRestTicks));
            killed = true;
            break;
          }
        }
        if (killed) break;
      }

      // energy drain (predators pay extra move cost)
      p.energy -= (baseTickDrain * p.hungerMult * hungerGlobal) + steps * moveCost * predatorMoveCostMult;
      if (p.energy <= 0) preds.splice(i, 1);
    }

    // hard cap
    let total = prey.length + preds.length;
    if (total > maxCreatures) {
      const needCull = total - maxCreatures;
      const cullPrey = Math.min(needCull, prey.length);
      prey.splice(0, cullPrey);
      total = prey.length + preds.length;
      if (total > maxCreatures) preds.splice(0, total - maxCreatures);
    }
  }

  /* ---- drawing ---- */
  function drawGrid(ctx, palette) {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.beginPath();
    for (let x = 0; x <= GRID_W; x++) {
      ctx.moveTo(x * CELL_SIZE + 0.5, 0);
      ctx.lineTo(x * CELL_SIZE + 0.5, CANVAS_H);
    }
    for (let y = 0; y <= GRID_H; y++) {
      ctx.moveTo(0, y * CELL_SIZE + 0.5);
      ctx.lineTo(CANVAS_W, y * CELL_SIZE + 0.5);
    }
    ctx.strokeStyle = palette.gridMinor; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();
    for (let x = 0; x <= GRID_W; x += 10) {
      ctx.moveTo(x * CELL_SIZE + 0.5, 0);
      ctx.lineTo(x * CELL_SIZE + 0.5, CANVAS_H);
    }
    for (let y = 0; y <= GRID_H; y += 10) {
      ctx.moveTo(0, y * CELL_SIZE + 0.5);
      ctx.lineTo(CANVAS_W, y * CELL_SIZE + 0.5);
    }
    ctx.strokeStyle = palette.gridMajor; ctx.stroke();
  }

  function draw() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const palette = getThemePalette();
    drawGrid(ctx, palette);

    // Food
    ctx.fillStyle = palette.food;
    for (const key of foodRef.current) {
      const [x, y] = key.split(",").map(Number);
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Prey
    for (const c of preyRef.current) {
      const lightness = palette.isDark ? "62%" : "50%";
      ctx.fillStyle = `hsl(${c.hue}, 90%, ${lightness})`;
      ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = palette.preyStroke; ctx.lineWidth = 1;
      ctx.strokeRect(c.x * CELL_SIZE + 0.5, c.y * CELL_SIZE + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
    }

    // Predators
    for (const p of predsRef.current) {
      const lightness = palette.isDark ? "58%" : "48%";
      ctx.fillStyle = `hsl(${p.hue}, 100%, ${lightness})`;
      ctx.fillRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = palette.predStroke; ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x * CELL_SIZE + 0.5, p.y * CELL_SIZE + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
    }

    // Overlay legend
    const ox = 8, oy = 8 + 32;
    ctx.font = '12px ui-monospace,Menlo,Consolas,monospace';
    ctx.fillStyle = palette.text;
    ctx.fillText('Legend:', 8, 8 + 16);
    ctx.fillStyle = '#39FF14'; ctx.fillRect(ox, oy, 10, 10); ctx.fillStyle = palette.text; ctx.fillText('Food (Neon Green)', ox + 16, oy - 1 + 10);
    ctx.fillStyle = 'hsl(55, 90%, 55%)'; ctx.fillRect(ox, oy + 16, 10, 10); ctx.fillStyle = 'hsl(220, 90%, 55%)'; ctx.fillRect(ox + 16, oy + 16, 10, 10);
    ctx.fillStyle = palette.text; ctx.fillText('Prey (Yellow / Blue)', ox + 32, oy + 16 + 10 - 1);
    ctx.fillStyle = 'hsl(0, 100%, 52%)'; ctx.fillRect(ox, oy + 32, 10, 10); ctx.fillStyle = palette.text; ctx.fillText('Predators (Red)', ox + 16, oy + 32 + 10 - 1);
  }

  /* ---- chart ---- */
  function pushHistoryAndRedraw() {
    const prey = preyRef.current.length;
    const pred = predsRef.current.length;
    const food = foodRef.current.size;

    histPreyRef.current.push(prey);
    histPredRef.current.push(pred);
    histFoodRef.current.push(food);
    if (histPreyRef.current.length > CHART_HISTORY) {
      histPreyRef.current.shift(); histPredRef.current.shift(); histFoodRef.current.shift();
    }
    drawChart();
  }

  function drawChart() {
    const canvas = chartCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const palette = getThemePalette();

    ctx.clearRect(0, 0, CHART_W, CHART_H);
    ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, CHART_W, CHART_H);

    // grid
    ctx.strokeStyle = palette.chartGrid; ctx.lineWidth = 1;
    for (let x = 0; x <= CHART_W; x += 52) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, CHART_H); ctx.stroke(); }
    for (let y = 0; y <= CHART_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(CHART_W, y + 0.5); ctx.stroke(); }

    const maxVal = Math.max(
      10,
      ...histPreyRef.current,
      ...histPredRef.current,
      ...histFoodRef.current
    );
    const scaleX = CHART_W / Math.max(1, histPreyRef.current.length - 1);
    const scaleY = (v) => CHART_H - (v / maxVal) * (CHART_H - 6);

    function line(arr, color) {
      if (arr.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(0, scaleY(arr[0]));
      for (let i = 1; i < arr.length; i++) ctx.lineTo(i * scaleX, scaleY(arr[i]));
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    }

    line(histFoodRef.current, palette.chartFood);
    line(histPreyRef.current, palette.chartPrey);
    line(histPredRef.current, palette.chartPred);

    // axes
    ctx.strokeStyle = palette.chartAxis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0.5, 0); ctx.lineTo(0.5, CHART_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, CHART_H - 0.5); ctx.lineTo(CHART_W, CHART_H - 0.5); ctx.stroke();

    // labels
    ctx.fillStyle = palette.chartAxis; ctx.font = '11px ui-monospace,Menlo,Consolas,monospace';
    ctx.fillText(`max: ${maxVal}`, CHART_W - 80, 10);
  }

  function setStatsSummary() {
    const pop = preyRef.current.length;
    const preds = predsRef.current.length;
    const food = foodRef.current.size;
    let avgSpeed = 0, avgHunger = 0;
    if (pop) {
      for (const c of preyRef.current) { avgSpeed += c.speed; avgHunger += c.hungerMult; }
      avgSpeed /= pop; avgHunger /= pop;
    }
    setStats({ pop, preds, food, avgSpeed: +avgSpeed.toFixed(2), avgHunger: +avgHunger.toFixed(2) });
  }

  /* ---- controls ---- */
  const start = () => {
    if (intervalIdRef.current) return;
    setIsRunning(true);
    const intervalMs = Math.max(5, Math.floor(1000 / tickRate));
    let last = performance.now();
    intervalIdRef.current = setInterval(() => {
      const now = performance.now();
      const delta = now - last; last = now;
      stepSimulation(delta);
      draw();
      setTickCount((t) => t + 1);
      if ((tickCount + 1) % 5 === 0) {
        setStatsSummary();
        pushHistoryAndRedraw();
      }
    }, intervalMs);
  };
  const stop = () => { setIsRunning(false); if (intervalIdRef.current) { clearInterval(intervalIdRef.current); intervalIdRef.current = null; } };
  const toggleRun = () => (isRunning ? stop() : start());
  const handleReset = () => { stop(); resetWorld(false); };
  const handleReseed = () => { stop(); resetWorld(true); };

  return (
    <div className="panel" style={{ maxWidth: 1320, margin: "16px auto" }}>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Evolution Simulation — 100×100 (Predator-Prey + Chart)</h2>
        <button
          className="btn ghost"
          onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "" : "dark")}
          title="Toggle theme (Light/Auto/Dark)"
        >
          Theme: {theme || "auto"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, marginTop: 12 }}>
        {/* Canvas + overlay */}
        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ borderRadius: 12, border: "1px solid var(--border)" }}
          />
          <div className="overlay">
            <div>Ticks: {tickCount}</div>
            <div>
              Prey: {stats.pop} | Preds: {stats.preds} | Food: {stats.food} | Avg Prey Speed: {stats.avgSpeed} | Avg Prey Hunger: {stats.avgHunger}
            </div>
            <div style={{ marginTop: 4, opacity: .85 }}>Legend: Food = neon green, Prey = yellow/blue, Predators = red</div>
          </div>
          <div className="toolbar" style={{ marginTop: 8 }}>
            <button className="btn" onClick={toggleRun}>{isRunning ? "Pause" : "Start"}</button>
            <button className="btn ghost" onClick={handleReset}>Reset</button>
            <button className="btn ghost" onClick={handleReseed}>Reseed RNG</button>
          </div>
        </div>

        {/* Right side: Chart + Controls */}
        <div className="panel">
          <div className="chart-wrap" style={{ marginBottom: 12 }}>
            <canvas ref={chartCanvasRef} width={CHART_W} height={CHART_H}
              style={{ width: CHART_W, height: CHART_H, borderRadius: 10, border: "1px solid var(--border)" }} />
            <div className="chart-legend" style={{ marginTop: 6 }}>
              <span className="dot" style={{ background: getThemePalette().chartPrey }} /> Prey
              <span className="dot" style={{ background: getThemePalette().chartPred }} /> Predators
              <span className="dot" style={{ background: getThemePalette().chartFood }} /> Food
            </div>
          </div>

          <div className="controls">
            <Slider label="Tick Rate (ticks/sec)" min={1} max={60} step={1} value={tickRate} setValue={setTickRate} />
            <Slider label="Starting Prey" min={0} max={2000} step={10} value={startCreatures} setValue={setStartCreatures} />
            <Slider label="Starting Carnivores" min={0} max={500} step={5} value={startCarnivores} setValue={setStartCarnivores} />
            <Slider label="Initial Food" min={0} max={5000} step={10} value={initialFood} setValue={setInitialFood} />
            <Slider label="Food per Spawn (replaces)" min={0} max={1000} step={10} value={foodPerSpawn} setValue={setFoodPerSpawn} />
            <Slider label="Spawn Interval (ms)" min={100} max={5000} step={50} value={spawnIntervalMs} setValue={setSpawnIntervalMs} />

            <Slider label="Base Tick Drain" min={0} max={5} step={0.1} value={baseTickDrain} setValue={setBaseTickDrain} />
            <Slider label="Move Cost per Step" min={0} max={1} step={0.05} value={moveCost} setValue={setMoveCost} />
            <Slider label="Hunger Global ×" min={0.2} max={3} step={0.05} value={hungerGlobal} setValue={setHungerGlobal} />

            <Slider label="Energy per Food (Prey)" min={1} max={300} step={1} value={energyPerFood} setValue={setEnergyPerFood} />

            <Slider label="Pred Vision ×" min={0.5} max={3} step={0.05} value={predatorVisionMult} setValue={setPredatorVisionMult} />
            <Slider label="Pred Speed ×" min={1} max={3} step={0.05} value={predatorSpeedMult} setValue={setPredatorSpeedMult} />
            <Slider label="Pred Move Cost ×" min={0.5} max={3} step={0.05} value={predatorMoveCostMult} setValue={setPredatorMoveCostMult} />
            <Slider label="Energy per Kill (Pred)" min={10} max={500} step={5} value={energyPerKill} setValue={setEnergyPerKill} />
            <Slider label="Pred Rest (ticks)" min={0} max={60} step={1} value={predatorRestTicks} setValue={setPredatorRestTicks} />
            <Slider label="Pred Repro Energy ≥" min={0} max={400} step={5} value={predatorReproEnergy} setValue={setPredatorReproEnergy} />
            <Slider label="Predator Max Share %" min={5} max={90} step={1} value={predatorMaxSharePct} setValue={setPredatorMaxSharePct} />

            <Slider label="Vision Radius (Prey)" min={1} max={25} step={1} value={visionRadius} setValue={setVisionRadius} />
            <Slider label="Speed Min (Prey Base)" min={0.1} max={5} step={0.1} value={speedMin} setValue={(v)=> setSpeedMin(Math.min(v, speedMax - 0.1))} />
            <Slider label="Speed Max (Prey Base)" min={0.2} max={6} step={0.1} value={speedMax} setValue={(v)=> setSpeedMax(Math.max(v, speedMin + 0.1))} />
            <Slider label="Mutation ±%" min={0} max={0.3} step={0.01} value={mutationPct} setValue={setMutationPct} format={(v)=> (v*100).toFixed(0) + "%"} />
            <Slider label="Max Total Creatures" min={100} max={20000} step={100} value={maxCreatures} setValue={setMaxCreatures} />

            <div>
              <div className="label"><span>Random Seed</span></div>
              <input type="number" value={seed} onChange={(e)=> setSeed(parseInt(e.target.value||"0",10))}
                     style={{ width:"100%", padding:"8px", borderRadius:8, border:"1px solid var(--border)", background:"var(--panel)", color:"var(--text)" }}/>
              <div className="label"><span>Tip:</span><span>Adjust sliders then <b>Reset</b> to apply to a new run.</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Slider -------------------- */
function Slider({ label, min, max, step, value, setValue, format }) {
  useEffect(() => {
    const el = document.getElementById(`rng-${label}`);
    if (!el) return;
    const pct = ((value - min) / (max - min)) * 100;
    el.style.backgroundSize = `${pct}% 100%`;
  }, [value, min, max, label]);
  return (
    <div>
      <div className="label">
        <span>{label}</span>
        <span style={{ fontFamily: "ui-monospace,Menlo,Consolas,monospace" }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        id={`rng-${label}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
      />
    </div>
  );
}
