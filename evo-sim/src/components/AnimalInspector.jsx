import { useState } from "react";
import { BAND_LABELS, PREDATOR_BASE_ENERGY } from "../sim/constants.js";

const TRAITS = [
  { key: "speed", label: "Speed", digits: 2 },
  { key: "hungerMult", label: "Hunger ×", digits: 2 },
  { key: "visionRadius", label: "Vision radius", digits: 1, unit: " tiles" },
];

// Higher is "better" for these; camo/vision/speed all help survival.
const HIGHER_IS_BETTER = { speed: true, visionRadius: true, camoLevel: true, hungerMult: false, camoTendency: true };

function fmt(v, digits = 2) {
  return typeof v === "number" ? v.toFixed(digits) : "—";
}

function Delta({ now, then, traitKey }) {
  if (typeof now !== "number" || typeof then !== "number") return null;
  const diff = now - then;
  if (Math.abs(diff) < 1e-6) {
    return <span style={{ opacity: 0.5, marginLeft: 6 }}>=</span>;
  }
  const better = HIGHER_IS_BETTER[traitKey] ? diff > 0 : diff < 0;
  const color = better ? "#22c55e" : "#f87171";
  return (
    <span style={{ color, marginLeft: 6, fontWeight: 600 }}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(2)}
    </span>
  );
}

export default function AnimalInspector({ entity, kind, onClose }) {
  const history = buildHistory(entity);
  const [compareIdx, setCompareIdx] = useState(0);

  if (!entity) return null;

  const compareTo = history[Math.min(compareIdx, history.length - 1)];
  const isPred = kind === "predator";
  // Energy has no upper cap (eating keeps adding), so the bar is shown
  // relative to spawn energy and clamped — the raw number carries the
  // real value rather than a fake "x / max" ceiling.
  const spawnEnergy = isPred ? PREDATOR_BASE_ENERGY : 100;
  const energyRatio = entity.energy / spawnEnergy;
  const energyPct = Math.max(0, Math.min(100, energyRatio * 100));

  const lineage = isPred ? "Predator (Red)" : (BAND_LABELS[entity.colorBand] || entity.colorBand);

  return (
    <div
      role="dialog"
      aria-label="Animal inspector"
      style={{
        position: "absolute", top: 12, right: 12, width: 320, zIndex: 10,
        background: "var(--panel)", border: "1px solid var(--border)",
        borderRadius: 12, boxShadow: "var(--shadow)", padding: 12,
        font: "12px/1.5 ui-monospace,Menlo,Consolas,monospace", color: "var(--text)",
        maxHeight: "calc(100% - 24px)", overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 14, height: 14, borderRadius: 3, display: "inline-block",
            background: `hsl(${entity.hue}, ${isPred ? 100 : 90}%, 55%)`,
            border: entity.camoTicksLeft > 0 ? "2px solid #fff" : "1px solid var(--border)",
          }} />
          <b>{lineage}</b>
        </div>
        <button className="btn ghost" style={{ padding: "2px 8px" }} onClick={onClose}>✕</button>
      </div>

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        <div style={{ opacity: 0.7 }}>Generation</div>
        <div><b style={{
          padding: "0 6px", borderRadius: 4,
          background: "color-mix(in srgb, var(--accent) 25%, transparent)",
          boxShadow: "0 0 8px color-mix(in srgb, var(--accent) 60%, transparent)",
        }}>{entity.generation}</b></div>
        <div style={{ opacity: 0.7 }}>Lineage</div><div>{lineage}</div>
        <div style={{ opacity: 0.7 }}>Hue</div><div>{entity.hue.toFixed(1)}°</div>
      </div>

      <div style={{ marginTop: 10, fontWeight: 600, opacity: 0.8 }}>Current needs</div>
      <div style={{ marginTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.7 }}>Energy</span>
          <span>{entity.energy.toFixed(1)} <span style={{ opacity: 0.6 }}>({energyRatio.toFixed(1)}× spawn)</span></span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "var(--border)", marginTop: 3, overflow: "hidden" }}>
          <div style={{
            width: `${energyPct}%`, height: "100%",
            background: energyPct < 25 ? "#f87171" : energyPct < 60 ? "#fbbf24" : "#22c55e",
          }} />
        </div>
      </div>
      <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        {isPred && <><div style={{ opacity: 0.7 }}>State</div>
          <div>{entity.rest > 0 ? `resting (${entity.rest})` : entity.camoTicksLeft > 0 ? `stealth (${entity.camoTicksLeft})` : "hunting"}</div></>}
        {!isPred && <><div style={{ opacity: 0.7 }}>Camouflage</div>
          <div>Lv {entity.camoLevel} ({entity.camoLevel * 25}% harder to spot)</div></>}
        {isPred && <><div style={{ opacity: 0.7 }}>Camo tendency</div><div>{fmt(entity.camoTendency)}</div></>}
      </div>

      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 600, opacity: 0.8 }}>Compare to</span>
        <select
          value={compareIdx}
          onChange={(e) => setCompareIdx(Number(e.target.value))}
          style={{
            flex: 1, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)",
            background: "var(--bg)", color: "var(--text)", font: "inherit",
          }}
        >
          {history.map((h, i) => (
            <option key={i} value={i}>{h.label}</option>
          ))}
        </select>
      </div>

      {history.length === 0 ? (
        <div style={{ marginTop: 8, opacity: 0.6 }}>Founder — no ancestors recorded yet.</div>
      ) : (
        <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ opacity: 0.7, textAlign: "left" }}>
              <th style={{ fontWeight: 500 }}>Trait</th>
              <th style={{ fontWeight: 500 }}>Gen {compareTo?.generation ?? "?"}</th>
              <th style={{ fontWeight: 500 }}>Now</th>
            </tr>
          </thead>
          <tbody>
            {TRAITS.map((t) => (
              <tr key={t.key}>
                <td style={{ opacity: 0.7, paddingTop: 3 }}>{t.label}</td>
                <td style={{ paddingTop: 3 }}>{fmt(compareTo?.[t.key], t.digits)}</td>
                <td style={{ paddingTop: 3 }}>
                  <b style={{
                    padding: "0 4px", borderRadius: 4,
                    background: "color-mix(in srgb, var(--accent) 20%, transparent)",
                    boxShadow: "0 0 6px color-mix(in srgb, var(--accent) 45%, transparent)",
                  }}>{fmt(entity[t.key], t.digits)}</b>
                  <Delta now={entity[t.key]} then={compareTo?.[t.key]} traitKey={t.key} />
                </td>
              </tr>
            ))}
            {!isPred && (
              <tr>
                <td style={{ opacity: 0.7, paddingTop: 3 }}>Camo level</td>
                <td style={{ paddingTop: 3 }}>{compareTo?.camoLevel ?? "—"}</td>
                <td style={{ paddingTop: 3 }}>
                  <b style={{
                    padding: "0 4px", borderRadius: 4,
                    background: "color-mix(in srgb, var(--accent) 20%, transparent)",
                    boxShadow: "0 0 6px color-mix(in srgb, var(--accent) 45%, transparent)",
                  }}>{entity.camoLevel}</b>
                  <Delta now={entity.camoLevel} then={compareTo?.camoLevel} traitKey="camoLevel" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 8, opacity: 0.55, fontSize: 11 }}>
        Ancestry keeps the gen-0 founder plus the 3 most recent ancestors.
      </div>
    </div>
  );
}

// Founder snapshot first, then recent ancestors oldest→newest.
function buildHistory(entity) {
  if (!entity?.ancestry) return [];
  const out = [];
  const { founder, recent } = entity.ancestry;
  if (founder && founder.generation !== entity.generation) {
    out.push({ ...founder, label: `Gen ${founder.generation} (founder)` });
  }
  for (const snap of recent) {
    if (founder && snap.generation === founder.generation) continue;
    out.push({ ...snap, label: `Gen ${snap.generation}` });
  }
  return out;
}
