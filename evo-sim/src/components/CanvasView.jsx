import { CANVAS_W, CANVAS_H, CELL_SIZE } from "../sim/constants.js";
import StatsOverlay from "./StatsOverlay.jsx";
import { RunControls } from "./Toolbar.jsx";
import AnimalInspector from "./AnimalInspector.jsx";
import { wrappedManhattan } from "../sim/movement.js";

// Click tolerance in tiles — an exact 1-tile hit is hard to land on a
// 6px cell, so fall back to the closest animal within a small radius.
const PICK_RADIUS = 2;

export default function CanvasView({
  canvasRef, tickCount, stats,
  isRunning, toggleRun, handleReset, handleReseed,
  worldRef, selected, setSelected,
}) {
  function handleClick(e) {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;
    const rect = canvas.getBoundingClientRect();
    const gx = Math.floor(((e.clientX - rect.left) / rect.width) * CANVAS_W / CELL_SIZE);
    const gy = Math.floor(((e.clientY - rect.top) / rect.height) * CANVAS_H / CELL_SIZE);

    let best = null, bestD = Infinity, bestKind = null;
    for (const [list, kind] of [[world.prey, "prey"], [world.preds, "predator"]]) {
      for (const ent of list) {
        const d = wrappedManhattan(gx, gy, ent.x, ent.y);
        if (d <= PICK_RADIUS && d < bestD) { bestD = d; best = ent; bestKind = kind; }
      }
    }
    setSelected(best ? { id: best.id, kind: bestKind } : null);
  }

  const live = selected
    ? (selected.kind === "prey" ? worldRef.current?.prey : worldRef.current?.preds)?.find((e) => e.id === selected.id)
    : null;

  return (
    <div className="canvas-wrap" style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleClick}
        style={{ borderRadius: 12, border: "1px solid var(--border)", cursor: "pointer" }}
      />
      <StatsOverlay tickCount={tickCount} stats={stats} />
      {selected && (
        live
          ? <AnimalInspector entity={live} kind={selected.kind} onClose={() => setSelected(null)} />
          : <DeceasedNotice onClose={() => setSelected(null)} />
      )}
      <RunControls isRunning={isRunning} toggleRun={toggleRun} handleReset={handleReset} handleReseed={handleReseed} />
    </div>
  );
}

function DeceasedNotice({ onClose }) {
  return (
    <div style={{
      position: "absolute", top: 12, right: 12, width: 220, zIndex: 10,
      background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12,
      boxShadow: "var(--shadow)", padding: 12,
      font: "12px/1.5 ui-monospace,Menlo,Consolas,monospace", color: "var(--text)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>This animal has died.</span>
        <button className="btn ghost" style={{ padding: "2px 8px" }} onClick={onClose}>✕</button>
      </div>
    </div>
  );
}
