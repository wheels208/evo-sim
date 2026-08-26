import { GRID_W, GRID_H } from "./constants.js";

const QUADRANTS = [
  { x0: 0, y0: 0, x1: GRID_W / 2, y1: GRID_H / 2 },
  { x0: GRID_W / 2, y0: 0, x1: GRID_W, y1: GRID_H / 2 },
  { x0: 0, y0: GRID_H / 2, x1: GRID_W / 2, y1: GRID_H },
  { x0: GRID_W / 2, y0: GRID_H / 2, x1: GRID_W, y1: GRID_H },
];

// Scatters `clusterCount` groups of `clusterSize` obstacle tiles across
// randomly chosen quadrants. Tiles within a cluster land at small random
// offsets around an anchor point, so a cluster is "grouped" but not
// necessarily one solid contiguous shape.
export function generateObstacles(rng, clusterCount, clusterSize) {
  const obstacles = new Set();
  for (let i = 0; i < clusterCount; i++) {
    const q = QUADRANTS[Math.floor(rng() * QUADRANTS.length)];
    const anchorX = Math.floor(q.x0 + rng() * (q.x1 - q.x0));
    const anchorY = Math.floor(q.y0 + rng() * (q.y1 - q.y0));
    let placed = 0;
    let attempts = 0;
    while (placed < clusterSize && attempts < clusterSize * 20) {
      attempts++;
      const ox = Math.floor(rng() * 5) - 2; // -2..2
      const oy = Math.floor(rng() * 5) - 2;
      const x = ((anchorX + ox) % GRID_W + GRID_W) % GRID_W;
      const y = ((anchorY + oy) % GRID_H + GRID_H) % GRID_H;
      const key = `${x},${y}`;
      if (!obstacles.has(key)) { obstacles.add(key); placed++; }
    }
  }
  return obstacles;
}

export function isObstacle(obstacles, x, y) {
  return obstacles.has(`${x},${y}`);
}

// Rejection-samples a tile that isn't an obstacle. Obstacle coverage is
// tiny relative to the map (a handful of tiles out of 10,000), so this
// resolves in ~1 try on average.
export function randomFreeTile(rng, obstacles) {
  for (let attempts = 0; attempts < 200; attempts++) {
    const x = Math.floor(rng() * GRID_W);
    const y = Math.floor(rng() * GRID_H);
    if (!isObstacle(obstacles, x, y)) return { x, y };
  }
  return { x: 0, y: 0 };
}

// A step from (fromX,fromY) to (toX,toY) (adjacent tile) is blocked if:
//  - the destination itself is an obstacle, or
//  - the step is diagonal and the two "flanking" corner tiles are both
//    obstacles (an entity can't cut through the gap between two
//    diagonally-adjacent obstacle tiles).
export function canStep(obstacles, fromX, fromY, toX, toY) {
  if (isObstacle(obstacles, toX, toY)) return false;
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx !== 0 && dy !== 0) {
    const corner1 = isObstacle(obstacles, fromX + dx, fromY);
    const corner2 = isObstacle(obstacles, fromX, fromY + dy);
    if (corner1 && corner2) return false;
  }
  return true;
}
