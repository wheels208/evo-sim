# Evolution Sim

A 100x100-grid predator/prey evolution sandbox: prey chase food and flee predators, mutate inherited traits (speed, hunger, vision radius, hue, prey camouflage level, and predator camouflage tendency) each generation, and everything is tunable live via the sliders.

Click any animal on the map to open an inspector showing its lineage, generation, current needs, and a trait comparison against its gen-0 founder or any of its 3 most recent ancestors. Hover the population chart for a per-tick readout of prey/predator/food counts and total population.

## Running it

Requires [Node.js](https://nodejs.org/) (LTS, 18+) and npm, which come bundled together.

**macOS/Linux:** install via [nvm](https://github.com/nvm-sh/nvm) if you don't have Node already:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc && nvm install --lts
```

**Windows 11:** install via `winget` (PowerShell):
```powershell
winget install --id Git.Git -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
```
Reopen PowerShell afterward so `git`/`node`/`npm` are on `PATH`.

Then, from this folder on either OS:

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL in a browser. `npm run build` produces a static production build in `dist/`; `npm run preview` serves that build locally.

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
