# Evolution Sim

A 100x100-grid predator/prey evolution sandbox: prey chase food and flee predators, mutate inherited traits (speed, hunger, hue, and — for predators — camouflage tendency) each generation, and everything is tunable live via the sliders.

## Running it

Requires [Node.js](https://nodejs.org/) (LTS, 18+) and npm, which come bundled together.

```bash
npm install
npm run dev
```

Then open the printed `http://localhost:5173` URL in a browser. `npm run build` produces a static production build in `dist/`; `npm run preview` serves that build locally.

## Project layout

```
src/
  App.jsx              top-level component: owns all slider state, wires everything together
  hooks/
    useTheme.js         light/dark/auto theme + palette lookup
    useSimulationLoop.js tick interval, start/stop/toggle
  sim/
    constants.js         grid size, defaults, color bands
    rng.js                seeded RNG (mulberry32) + hue helpers
    entities.js           prey/predator spawn + mutation
    obstacles.js           obstacle cluster generation + passability rules
    movement.js             shared step-with-obstacle-avoidance helper
    spatialGrid.js           uniform-grid neighbor index (see below)
    simulation.js             the per-tick simulation step
  render/
    drawWorld.js         canvas drawing of the grid/entities
    drawChart.js         population history chart
  components/           presentational React pieces (sliders, panels, canvas wrapper)
```

## Performance notes

The per-tick "find nearest predator/prey within vision" lookups use a uniform spatial hash grid (`sim/spatialGrid.js`) rebuilt each tick, instead of every entity scanning the entire opposing population. That keeps the simulation step scaling close to O(n) with population size rather than O(n·m). See the comment at the top of `spatialGrid.js` for the detailed rationale.

## History

The original single-file version of this sim lives in git history (see the "Baseline" commit) rather than a duplicated `legacy/` folder — use `git log` / `git show` to look back at it.
