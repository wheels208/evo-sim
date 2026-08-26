import { CHART_W, CHART_H } from "../sim/constants.js";

export function drawChart(canvas, palette, history) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, CHART_W, CHART_H);
  ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, CHART_W, CHART_H);

  ctx.strokeStyle = palette.chartGrid; ctx.lineWidth = 1;
  for (let x = 0; x <= CHART_W; x += 52) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, CHART_H); ctx.stroke(); }
  for (let y = 0; y <= CHART_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(CHART_W, y + 0.5); ctx.stroke(); }

  const { prey, preds, food } = history;
  const maxVal = Math.max(10, ...prey, ...preds, ...food);
  const scaleX = CHART_W / Math.max(1, prey.length - 1);
  const scaleY = (v) => CHART_H - (v / maxVal) * (CHART_H - 6);

  function line(arr, color) {
    if (arr.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(0, scaleY(arr[0]));
    for (let i = 1; i < arr.length; i++) ctx.lineTo(i * scaleX, scaleY(arr[i]));
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  }

  line(food, palette.chartFood);
  line(prey, palette.chartPrey);
  line(preds, palette.chartPred);

  ctx.strokeStyle = palette.chartAxis; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0.5, 0); ctx.lineTo(0.5, CHART_H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, CHART_H - 0.5); ctx.lineTo(CHART_W, CHART_H - 0.5); ctx.stroke();

  ctx.fillStyle = palette.chartAxis; ctx.font = '11px ui-monospace,Menlo,Consolas,monospace';
  ctx.fillText(`max: ${maxVal}`, CHART_W - 80, 10);
}
