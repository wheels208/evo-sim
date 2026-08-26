import { GRID_W, GRID_H, CELL_SIZE, CANVAS_W, CANVAS_H } from "../sim/constants.js";

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

export function drawWorld(canvas, palette, world) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  drawGrid(ctx, palette);

  // Obstacles
  ctx.fillStyle = palette.obstacle;
  for (const key of world.obstacles) {
    const [x, y] = key.split(",").map(Number);
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }

  // Food
  ctx.fillStyle = palette.food;
  for (const key of world.food) {
    const [x, y] = key.split(",").map(Number);
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }

  // Prey
  for (const c of world.prey) {
    const lightness = palette.isDark ? "62%" : "50%";
    ctx.fillStyle = `hsl(${c.hue}, 90%, ${lightness})`;
    ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = palette.preyStroke; ctx.lineWidth = 1;
    ctx.strokeRect(c.x * CELL_SIZE + 0.5, c.y * CELL_SIZE + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
  }

  // Predators
  for (const p of world.preds) {
    const lightness = palette.isDark ? "58%" : "48%";
    ctx.fillStyle = `hsl(${p.hue}, 100%, ${lightness})`;
    ctx.fillRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    const camouflaged = p.camoTicksLeft > 0;
    ctx.strokeStyle = camouflaged ? palette.camoStroke : palette.predStroke;
    ctx.lineWidth = camouflaged ? 1.5 : 1.5;
    ctx.strokeRect(p.x * CELL_SIZE + 0.5, p.y * CELL_SIZE + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
  }

  // Overlay legend
  const ox = 8, oy = 8 + 32;
  ctx.font = '12px ui-monospace,Menlo,Consolas,monospace';
  ctx.fillStyle = palette.text;
  ctx.fillText('Legend:', 8, 8 + 16);
  ctx.fillStyle = '#39FF14'; ctx.fillRect(ox, oy, 10, 10); ctx.fillStyle = palette.text; ctx.fillText('Food (Neon Green)', ox + 16, oy - 1 + 10);
  ctx.fillStyle = palette.obstacle; ctx.fillRect(ox, oy + 16, 10, 10); ctx.fillStyle = palette.text; ctx.fillText('Obstacles (Brown)', ox + 16, oy + 16 + 10 - 1);
  ctx.fillStyle = 'hsl(0, 100%, 52%)'; ctx.fillRect(ox, oy + 32, 10, 10); ctx.fillStyle = palette.text; ctx.fillText('Predators (Red)', ox + 16, oy + 32 + 10 - 1);
  ctx.strokeStyle = palette.camoStroke; ctx.lineWidth = 1.5; ctx.strokeRect(ox + 0.5, oy + 48 + 0.5, 9, 9);
  ctx.fillStyle = palette.text; ctx.fillText('Predator in stealth (white border)', ox + 16, oy + 48 + 10 - 1);
  ctx.fillStyle = palette.text; ctx.fillText('Prey (5 hue bands, mutate within lineage)', ox, oy + 64 + 10 - 1);
}
