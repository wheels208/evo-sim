import { useEffect } from "react";

export default function Slider({ label, min, max, step, value, setValue, format }) {
  useEffect(() => {
    const el = document.getElementById(`rng-${label}`);
    if (!el) return;
    const pct = ((value - min) / (max - min)) * 100;
    el.style.backgroundSize = `${pct}% 100%`;
  }, [value, min, max, label]);
  return (
    <div>
      <div className="label">
        <span>{label}</span>
        <span style={{ fontFamily: "ui-monospace,Menlo,Consolas,monospace" }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        id={`rng-${label}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
      />
    </div>
  );
}
