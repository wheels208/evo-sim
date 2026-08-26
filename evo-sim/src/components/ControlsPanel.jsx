import Slider from "./Slider.jsx";

export default function ControlsPanel({ p }) {
  return (
    <div className="controls">
      <Slider label="Tick Rate (ticks/sec)" min={1} max={60} step={1} value={p.tickRate} setValue={p.setTickRate} />
      <Slider label="Prey per Species" min={0} max={50} step={1} value={p.preyPerSpecies} setValue={p.setPreyPerSpecies} />
      <Slider label="Starting Carnivores" min={0} max={500} step={5} value={p.startCarnivores} setValue={p.setStartCarnivores} />
      <Slider label="Initial Food" min={0} max={5000} step={10} value={p.initialFood} setValue={p.setInitialFood} />
      <Slider label="Food per Spawn (replaces)" min={0} max={1000} step={10} value={p.foodPerSpawn} setValue={p.setFoodPerSpawn} />
      <Slider label="Spawn Interval (ms)" min={100} max={5000} step={50} value={p.spawnIntervalMs} setValue={p.setSpawnIntervalMs} />

      <Slider label="Base Tick Drain" min={0} max={5} step={0.1} value={p.baseTickDrain} setValue={p.setBaseTickDrain} />
      <Slider label="Move Cost per Step" min={0} max={1} step={0.05} value={p.moveCost} setValue={p.setMoveCost} />
      <Slider label="Hunger Global ×" min={0.2} max={3} step={0.05} value={p.hungerGlobal} setValue={p.setHungerGlobal} />

      <Slider label="Energy per Food (Prey)" min={1} max={300} step={1} value={p.energyPerFood} setValue={p.setEnergyPerFood} />

      <Slider label="Pred Vision ×" min={0.5} max={3} step={0.05} value={p.predatorVisionMult} setValue={p.setPredatorVisionMult} />
      <Slider label="Pred Speed ×" min={1} max={3} step={0.05} value={p.predatorSpeedMult} setValue={p.setPredatorSpeedMult} />
      <Slider label="Pred Move Cost ×" min={0.5} max={3} step={0.05} value={p.predatorMoveCostMult} setValue={p.setPredatorMoveCostMult} />
      <Slider label="Energy per Kill (Pred)" min={10} max={500} step={5} value={p.energyPerKill} setValue={p.setEnergyPerKill} />
      <Slider label="Pred Rest (ticks)" min={0} max={60} step={1} value={p.predatorRestTicks} setValue={p.setPredatorRestTicks} />
      <Slider label="Pred Repro Energy ≥" min={0} max={400} step={5} value={p.predatorReproEnergy} setValue={p.setPredatorReproEnergy} />
      <Slider label="Predator Max Share %" min={5} max={90} step={1} value={p.predatorMaxSharePct} setValue={p.setPredatorMaxSharePct} />
      <Slider label="Pred Engage Radius (tiles)" min={0} max={15} step={1} value={p.predatorEngageRadius} setValue={p.setPredatorEngageRadius} />
      <Slider label="Pred Hunger Trigger %" min={0} max={1} step={0.05} value={p.predatorHungerTriggerPct} setValue={p.setPredatorHungerTriggerPct} format={(v) => (v * 100).toFixed(0) + "%"} />

      <Slider label="Camo Base Chance" min={0} max={0.1} step={0.005} value={p.camoBaseChance} setValue={p.setCamoBaseChance} format={(v) => (v * 100).toFixed(1) + "%"} />
      <Slider label="Camo Tendency Scale" min={0} max={1} step={0.05} value={p.camoTendencyScale} setValue={p.setCamoTendencyScale} />
      <Slider label="Camo Duration (ticks)" min={1} max={60} step={1} value={p.camoDuration} setValue={p.setCamoDuration} />
      <Slider label="Camo Drain ×" min={0.1} max={1} step={0.05} value={p.camoDrainMult} setValue={p.setCamoDrainMult} />

      <Slider label="Obstacle Clusters" min={0} max={20} step={1} value={p.obstacleClusterCount} setValue={p.setObstacleClusterCount} />
      <Slider label="Obstacle Cluster Size" min={1} max={30} step={1} value={p.obstacleClusterSize} setValue={p.setObstacleClusterSize} />

      <Slider label="Vision Radius (Prey)" min={1} max={25} step={1} value={p.visionRadius} setValue={p.setVisionRadius} />
      <Slider label="Speed Min (Prey Base)" min={0.1} max={5} step={0.1} value={p.speedMin} setValue={(v) => p.setSpeedMin(Math.min(v, p.speedMax - 0.1))} />
      <Slider label="Speed Max (Prey Base)" min={0.2} max={6} step={0.1} value={p.speedMax} setValue={(v) => p.setSpeedMax(Math.max(v, p.speedMin + 0.1))} />
      <Slider label="Mutation ±%" min={0} max={0.3} step={0.01} value={p.mutationPct} setValue={p.setMutationPct} format={(v) => (v * 100).toFixed(0) + "%"} />
      <Slider label="Max Total Creatures" min={100} max={20000} step={100} value={p.maxCreatures} setValue={p.setMaxCreatures} />

      <div>
        <div className="label"><span>Random Seed</span></div>
        <input type="number" value={p.seed} onChange={(e) => p.setSeed(parseInt(e.target.value || "0", 10))}
               style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
        <div className="label"><span>Tip:</span><span>Most sliders apply live, mid-run. Only population/generation settings (Prey per Species, Starting Carnivores, Initial Food, Obstacles, Seed) need a <b>Reset</b> to take effect.</span></div>
      </div>
    </div>
  );
}
