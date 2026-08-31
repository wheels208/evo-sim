// Uniform spatial hash grid for fast "nearest entity within radius" queries
// on the toroidal (wrap-around) world.
//
// Why: the naive approach ("for each prey, loop every predator" and vice
// versa) is O(N*M) per tick, which dominates runtime once populations get
// large. Bucketing entities by grid cell turns that into two O(N) passes
// per tick (one to build each grid, one where each entity only inspects
// the handful of buckets that overlap its vision radius) — so the total
// cost per tick scales ~O(N) with population instead of O(N*M), as long
// as entities stay roughly spread across the map (true here: fixed-size
// world, capped populations).
export class SpatialGrid {
  constructor(cellSize, worldW, worldH) {
    this.cellSize = Math.max(1, cellSize);
    this.worldW = worldW;
    this.worldH = worldH;
    this.cols = Math.ceil(worldW / this.cellSize);
    this.rows = Math.ceil(worldH / this.cellSize);
    this.buckets = new Map();
  }

  _bucketKey(bx, by) {
    return by * this.cols + bx;
  }

  // O(N): bucket every entity by its cell.
  build(entities) {
    this.buckets.clear();
    for (const e of entities) {
      const bx = Math.floor(e.x / this.cellSize) % this.cols;
      const by = Math.floor(e.y / this.cellSize) % this.rows;
      const key = this._bucketKey(bx, by);
      let list = this.buckets.get(key);
      if (!list) { list = []; this.buckets.set(key, list); }
      list.push(e);
    }
  }

  // Amortized ~O(local density): only scans buckets overlapping the
  // search radius around (x, y), wrapping at world edges, then filters
  // candidates by the caller-supplied wrapped distance function.
  queryNearest(x, y, radius, distanceFn, predicate) {
    const bx = Math.floor(x / this.cellSize) % this.cols;
    const by = Math.floor(y / this.cellSize) % this.rows;
    const bucketRadius = Math.max(1, Math.ceil(radius / this.cellSize));

    let nearest = null;
    let bestDist = Infinity;

    for (let dy = -bucketRadius; dy <= bucketRadius; dy++) {
      for (let dx = -bucketRadius; dx <= bucketRadius; dx++) {
        const cx = ((bx + dx) % this.cols + this.cols) % this.cols;
        const cy = ((by + dy) % this.rows + this.rows) % this.rows;
        const list = this.buckets.get(this._bucketKey(cx, cy));
        if (!list) continue;
        for (const cand of list) {
          const d = distanceFn(x, y, cand.x, cand.y);
          if (d > radius || d >= bestDist) continue;
          // Predicate receives the distance too, so callers can apply a
          // per-candidate effective radius (e.g. prey camouflage) rather
          // than only the single sweep radius.
          if (predicate && !predicate(cand, d)) continue;
          bestDist = d; nearest = cand;
        }
      }
    }
    return nearest;
  }
}

// O(N) to build, O(1) average lookup: which prey (if any) occupies a
// given tile this tick. Replaces scanning the full prey array per
// predator movement step to check for a same-tile kill.
export function buildTileOccupancy(entities) {
  const map = new Map();
  for (const e of entities) map.set(`${e.x},${e.y}`, e);
  return map;
}
