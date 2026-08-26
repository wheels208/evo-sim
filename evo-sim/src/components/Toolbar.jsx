export default function Toolbar({ theme, setTheme }) {
  return (
    <div className="toolbar" style={{ justifyContent: "space-between" }}>
      <h2 style={{ margin: 0 }}>Evolution Simulation — 100×100 (Predator-Prey + Chart)</h2>
      <button
        className="btn ghost"
        onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "" : "dark")}
        title="Toggle theme (Light/Auto/Dark)"
      >
        Theme: {theme || "auto"}
      </button>
    </div>
  );
}

export function RunControls({ isRunning, toggleRun, handleReset, handleReseed }) {
  return (
    <div className="toolbar" style={{ marginTop: 8 }}>
      <button className="btn" onClick={toggleRun}>{isRunning ? "Pause" : "Start"}</button>
      <button className="btn ghost" onClick={handleReset}>Reset</button>
      <button className="btn ghost" onClick={handleReseed}>Reseed RNG</button>
    </div>
  );
}
