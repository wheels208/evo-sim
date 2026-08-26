export default function StatsOverlay({ tickCount, stats }) {
  return (
    <div className="overlay">
      <div>Ticks: {tickCount}</div>
      <div>
        Prey: {stats.pop} | Preds: {stats.preds} | Food: {stats.food} | Avg Prey Speed: {stats.avgSpeed} | Avg Prey Hunger: {stats.avgHunger}
      </div>
      <div style={{ marginTop: 4, opacity: .85 }}>
        Legend: Food = neon green, Obstacles = brown, Prey = 5 hue bands, Predators = red (white border = stealthed)
      </div>
    </div>
  );
}
