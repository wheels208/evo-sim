import { GRID_W, GRID_H } from "./constants.js";
import { canStep } from "./obstacles.js";
import { choice } from "./rng.js";

export function wrappedManhattan(ax, ay, bx, by) {
  const dx = Math.min(Math.abs(ax - bx), GRID_W - Math.abs(ax - bx));
  const dy = Math.min(Math.abs(ay - by), GRID_H - Math.abs(ay - by));
  return dx + dy;
}

// Greedy single-axis step, picking whichever axis has the larger
// remaining wrapped distance to close first — same "direct-line
// pursuit" as before, just factored out so both prey and predators can
// share it. `dx0`/`dy0` is the wrapped delta to move along (toward a
// target, or away from a threat — the caller picks which delta to pass).
function axisStepFromDelta(dx0, dy0) {
  const sx = dx0 === 0 ? 0 : dx0 <= GRID_W / 2 ? 1 : -1;
  const sy = dy0 === 0 ? 0 : dy0 <= GRID_H / 2 ? 1 : -1;
  const ax = Math.min(Math.abs(dx0), GRID_W - Math.abs(dx0));
  const ay = Math.min(Math.abs(dy0), GRID_H - Math.abs(dy0));
  if (ax >= ay && sx !== 0) return { dx: sx, dy: 0, altDx: 0, altDy: sy };
  if (sy !== 0) return { dx: 0, dy: sy, altDx: sx, altDy: 0 };
  return { dx: sx, dy: 0, altDx: 0, altDy: sy };
}

const ORTHOGONAL_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Attempts one grid step for an entity at (x,y). `intent` is one of:
//   { toward: {x,y} } - chase: step closer to that point
//   { away:   {x,y} } - flee: step further from that point
//   null              - random wander
// Falls back through: primary axis -> secondary axis -> random open
// neighbor -> stay put, so obstacles are avoided locally without full
// pathfinding.
export function attemptStep(x, y, intent, obstacles, rng) {
  let primary, secondary;
  if (intent && intent.toward) {
    const dx0 = (intent.toward.x - x + GRID_W) % GRID_W;
    const dy0 = (intent.toward.y - y + GRID_H) % GRID_H;
    const step = axisStepFromDelta(dx0, dy0);
    primary = { dx: step.dx, dy: step.dy };
    secondary = { dx: step.altDx, dy: step.altDy };
  } else if (intent && intent.away) {
    const dx0 = (x - intent.away.x + GRID_W) % GRID_W;
    const dy0 = (y - intent.away.y + GRID_H) % GRID_H;
    const step = axisStepFromDelta(dx0, dy0);
    primary = { dx: step.dx, dy: step.dy };
    secondary = { dx: step.altDx, dy: step.altDy };
  } else {
    const [dx, dy] = choice(rng, ORTHOGONAL_DIRS);
    primary = { dx, dy };
    secondary = null;
  }

  const candidates = [primary, secondary].filter((d) => d && (d.dx !== 0 || d.dy !== 0));
  for (const d of candidates) {
    const nx = (x + d.dx + GRID_W) % GRID_W;
    const ny = (y + d.dy + GRID_H) % GRID_H;
    if (canStep(obstacles, x, y, nx, ny)) return { x: nx, y: ny, moved: true };
  }

  // Both preferred directions blocked — try any open orthogonal neighbor.
  const shuffled = [...ORTHOGONAL_DIRS].sort(() => rng() - 0.5);
  for (const [dx, dy] of shuffled) {
    const nx = (x + dx + GRID_W) % GRID_W;
    const ny = (y + dy + GRID_H) % GRID_H;
    if (canStep(obstacles, x, y, nx, ny)) return { x: nx, y: ny, moved: true };
  }

  // Boxed in on all sides — stay put for this step.
  return { x, y, moved: false };
}
