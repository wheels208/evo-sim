import { CHART_W, CHART_H } from "../sim/constants.js";

// Room for axis tick labels along the left and bottom edges.
const PAD_L = 38;
const PAD_B = 18;
const PAD_T = 8;
const PAD_R = 8;

const plotW = CHART_W - PAD_L - PAD_R;
const plotH = CHART_H - PAD_T - PAD_B;

export function chartGeometry(history) {
  const { prey, preds, food } = history;
  const n = prey.length;
  const maxVal = Math.max(10, ...prey, ...preds, ...food);
  const stepX = n > 1 ? plotW / (n - 1) : 0;
  return {
    n, maxVal, stepX, plotW, plotH, PAD_L, PAD_T, PAD_B, PAD_R,
    xAt: (i) => PAD_L + i * stepX,
    yAt: (v) => PAD_T + plotH - (v / maxVal) * plotH,
    // Nearest sample index for a pixel x within the plot area.
    indexAt: (px) => {
      if (n === 0) return -1;
      if (n === 1) return 0;
      const i = Math.round((px - PAD_L) / stepX);
      return Math.max(0, Math.min(n - 1, i));
    },
  };
}

function niceTicks(maxVal, count) {
  const step = maxVal / count;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, step))));
  const norm = step / mag;
  const niceStep = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const ticks = [];
  for (let v = 0; v <= maxVal; v += niceStep) ticks.push(Math.round(v));
  return ticks;
}

export function drawChart(canvas, palette, history, hoverIndex = -1) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const g = chartGeometry(history);
  const { prey, preds, food, ticks } = history;

  ctx.clearRect(0, 0, CHART_W, CHART_H);
  ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, CHART_W, CHART_H);
  ctx.font = '10px ui-monospace,Menlo,Consolas,monospace';

  // Y grid + value labels
  ctx.strokeStyle = palette.chartGrid; ctx.lineWidth = 1;
  ctx.fillStyle = palette.chartAxis;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const v of niceTicks(g.maxVal, 4)) {
    const y = g.yAt(v);
    ctx.beginPath(); ctx.moveTo(PAD_L, y + 0.5); ctx.lineTo(CHART_W - PAD_R, y + 0.5); ctx.stroke();
    ctx.fillText(String(v), PAD_L - 5, y);
  }

  // X grid + tick-number labels
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const xLabelCount = 4;
  if (g.n > 1) {
    for (let k = 0; k <= xLabelCount; k++) {
      const i = Math.round((k / xLabelCount) * (g.n - 1));
      const x = g.xAt(i);
      ctx.strokeStyle = palette.chartGrid;
      ctx.beginPath(); ctx.moveTo(x + 0.5, PAD_T); ctx.lineTo(x + 0.5, PAD_T + g.plotH); ctx.stroke();
      ctx.fillStyle = palette.chartAxis;
      ctx.fillText(String(ticks?.[i] ?? i), x, PAD_T + g.plotH + 4);
    }
  }

  function line(arr, color) {
    if (arr.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(g.xAt(0), g.yAt(arr[0]));
    for (let i = 1; i < arr.length; i++) ctx.lineTo(g.xAt(i), g.yAt(arr[i]));
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  }

  line(food, palette.chartFood);
  line(prey, palette.chartPrey);
  line(preds, palette.chartPred);

  // Axis lines
  ctx.strokeStyle = palette.chartAxis; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD_L + 0.5, PAD_T); ctx.lineTo(PAD_L + 0.5, PAD_T + g.plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD_L, PAD_T + g.plotH + 0.5); ctx.lineTo(CHART_W - PAD_R, PAD_T + g.plotH + 0.5); ctx.stroke();

  // Axis titles
  ctx.fillStyle = palette.chartAxis;
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  ctx.fillText('ticks →', CHART_W - PAD_R, CHART_H - 1);
  ctx.save();
  ctx.translate(9, PAD_T + g.plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('count', 0, 0);
  ctx.restore();

  // Hover crosshair + point markers
  if (hoverIndex >= 0 && hoverIndex < g.n) {
    const x = g.xAt(hoverIndex);
    ctx.strokeStyle = palette.chartAxis;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x + 0.5, PAD_T); ctx.lineTo(x + 0.5, PAD_T + g.plotH); ctx.stroke();
    ctx.setLineDash([]);
    const pts = [[food[hoverIndex], palette.chartFood], [prey[hoverIndex], palette.chartPrey], [preds[hoverIndex], palette.chartPred]];
    for (const [v, color] of pts) {
      if (v == null) continue;
      ctx.beginPath();
      ctx.arc(x, g.yAt(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = palette.bg; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
}
