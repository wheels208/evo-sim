import { CHART_W, CHART_H } from "../sim/constants.js";
import { getThemePalette } from "../hooks/useTheme.js";

export default function PopulationChart({ chartCanvasRef }) {
  const palette = getThemePalette();
  return (
    <div className="chart-wrap" style={{ marginBottom: 12 }}>
      <canvas ref={chartCanvasRef} width={CHART_W} height={CHART_H}
        style={{ width: CHART_W, height: CHART_H, borderRadius: 10, border: "1px solid var(--border)" }} />
      <div className="chart-legend" style={{ marginTop: 6 }}>
        <span className="dot" style={{ background: palette.chartPrey }} /> Prey
        <span className="dot" style={{ background: palette.chartPred }} /> Predators
        <span className="dot" style={{ background: palette.chartFood }} /> Food
      </div>
    </div>
  );
}
