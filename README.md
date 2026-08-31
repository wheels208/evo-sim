# Evo Sim

A 100x100-grid predator/prey evolution sandbox built with React + Vite. Prey chase food and flee predators, mutate inherited traits (speed, hunger, vision radius, hue, prey camouflage, and predator "lie in wait" tendency) each generation, and everything is tunable live via on-screen sliders while it runs. Click any animal to inspect its lineage and compare its stats against its ancestors; hover the chart for per-tick population readouts.

The actual project lives in the [`evo-sim/`](evo-sim) subfolder — that's where you run npm commands from.

## Quickstart

### macOS / Linux

```bash
git clone https://github.com/wheels208/evo-sim.git
cd evo-sim/evo-sim
```

Install Node.js if you don't have it (via [nvm](https://github.com/nvm-sh/nvm)):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc   # or ~/.bashrc
nvm install --lts
```

Then:

```bash
npm install
npm run dev
```

### Windows 11

Open **PowerShell** and install Git and Node.js (Windows 11 ships with `winget` built in):

```powershell
winget install --id Git.Git -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

Close and reopen PowerShell so both are picked up on `PATH`, then:

```powershell
git clone https://github.com/wheels208/evo-sim.git
cd evo-sim\evo-sim
npm install
npm run dev
```

### Either OS

`npm run dev` prints a local URL (typically `http://localhost:5173`) — open that in a browser and the sim loads. `Ctrl+C` in the terminal stops the dev server.

## Repo layout note

This repo is named `evo-sim`, and the project folder inside it is *also* named `evo-sim` — so after cloning you'll have `evo-sim/evo-sim/`. That's a naming quirk left over from how this project was built up incrementally, not a mistake in your clone.

## More detail

See [evo-sim/README.md](evo-sim/README.md) for the project's internal structure (`src/sim`, `src/render`, `src/hooks`, `src/components`) and a note on the O(n) spatial-grid optimization the simulation loop uses.

## History

The original single-file version of this sim (before it was split into this multi-file project) lives in git history rather than a duplicated `legacy/` folder — see the "Baseline" commit via `git log`.
