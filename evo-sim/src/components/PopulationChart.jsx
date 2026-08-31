import { useState } from "react";
import { CHART_W, CHART_H } from "../sim/constants.js";
import { getThemePalette } from "../hooks/useTheme.js";
import { chartGeometry } from "../render/drawChart.js";

export default function PopulationChart({ chartCanvasRef, histRef, onHoverIndex }) {
  const palette = getThemePalette();
  const [tip, setTip] = useState(null);

  function handleMove(e) {
    const canvas = chartCanvasRef.current;
    const hist = histRef.current;
    if (!canvas || !hist || hist.prey.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const g = chartGeometry(hist);
    const i = g.indexAt(px);
    if (i < 0) return;
    const prey = hist.prey[i], preds = hist.preds[i], food = hist.food[i];
    setTip({
      i,
      left: (g.xAt(i) / CHART_W) * rect.width,
      tick: hist.ticks?.[i] ?? i,
      prey, preds, food,
      total: prey + preds,
    });
    onHoverIndex?.(i);
  }

  function handleLeave() {
    setTip(null);
    onHoverIndex?.(-1);
  }

  return (
    <div className="chart-wrap" style={{ marginBottom: 12 }}>
      <div style={{ position: "relative", width: CHART_W, maxWidth: "100%" }}>
        <canvas
          ref={chartCanvasRef}
          width={CHART_W}
          height={CHART_H}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          style={{ width: "100%", height: CHART_H, borderRadius: 10, border: "1px solid var(--border)", display: "block", cursor: "crosshair" }}
        />
        {tip && (
          <div
            style={{
              position: "absolute",
              left: Math.min(Math.max(tip.left + 10, 4), CHART_W - 150),
              top: 6,
              pointerEvents: "none",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 8px",
              font: "11px/1.5 ui-monospace,Menlo,Consolas,monospace",
              color: "var(--text)",
              boxShadow: "var(--shadow)",
              whiteSpace: "nowrap",
              zIndex: 2,
            }}
          >
            <div style={{ opacity: 0.7 }}>tick {tip.tick}</div>
            <div><span style={{ color: palette.chartPrey }}>■</span> Prey: {tip.prey}</div>
            <div><span style={{ color: palette.chartPred }}>■</span> Preds: {tip.preds}</div>
            <div><span style={{ color: palette.chartFood }}>■</span> Food: {tip.food}</div>
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 3, paddingTop: 3 }}>
              Total pop: <b>{tip.total}</b>
            </div>
          </div>
        )}
      </div>
      <div className="chart-legend" style={{ marginTop: 6 }}>
        <span className="dot" style={{ background: palette.chartPrey }} /> Prey
        <span className="dot" style={{ background: palette.chartPred }} /> Predators
        <span className="dot" style={{ background: palette.chartFood }} /> Food
      </div>
    </div>
  );
}
