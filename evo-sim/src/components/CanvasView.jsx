import { CANVAS_W, CANVAS_H } from "../sim/constants.js";
import StatsOverlay from "./StatsOverlay.jsx";
import { RunControls } from "./Toolbar.jsx";

export default function CanvasView({
  canvasRef, tickCount, stats,
  isRunning, toggleRun, handleReset, handleReseed,
}) {
  return (
    <div className="canvas-wrap">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ borderRadius: 12, border: "1px solid var(--border)" }}
      />
      <StatsOverlay tickCount={tickCount} stats={stats} />
      <RunControls isRunning={isRunning} toggleRun={toggleRun} handleReset={handleReset} handleReseed={handleReseed} />
    </div>
  );
}
