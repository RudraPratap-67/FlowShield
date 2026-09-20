import React from 'react';
import {
  CloudRain,
  Play,
  Zap,
  RotateCcw,
  Sliders,
  ShieldCheck,
  ShieldX,
  Clock,
  Gauge,
  Sparkles,
} from 'lucide-react';

const PRESETS = [
  {
    id: 'cloudburst_2022',
    name: '2022 Bengaluru Cloudburst',
    rain: 110,
    duration: 2.0,
    desc: 'Record-breaking inundation over ORR & Bellandur',
  },
  {
    id: 'monsoon_peak',
    name: 'Monsoon Severe Downpour',
    rain: 65,
    duration: 2.5,
    desc: 'Sustained monsoon rain testing lake retention',
  },
  {
    id: 'flash_storm',
    name: 'Urban Flash Flood',
    rain: 85,
    duration: 1.0,
    desc: 'High-intensity convective cloudburst over city core',
  },
  {
    id: 'moderate_storm',
    name: 'Moderate Heavy Rain',
    rain: 40,
    duration: 2.0,
    desc: 'Design storm within standard municipal drain capacity',
  },
];

export default function SimulationControls({
  rainfall,
  setRainfall,
  duration,
  setDuration,
  onRunSimulation,
  isSimulating,
  onRunMlPredict,
  isMlPredicting,
  blockedDrains,
  onBlockHotspotDrain,
  onClearBlockages,
}) {
  const activeBlockedCount = blockedDrains?.length || 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-5">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase m-0">
            Storm & Drainage Controls
          </h3>
        </div>
        <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/50">
          Canonical 100×100 Grid
        </span>
      </div>

      {/* Scenario Presets */}
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-2">
          Historical & Design Storm Presets
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => {
            const isSelected = rainfall === p.rain && duration === p.duration;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setRainfall(p.rain);
                  setDuration(p.duration);
                }}
                className={`p-2 rounded-xl text-left transition border cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/50 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{p.name}</span>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">
                    {p.rain} mm/h
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders: Rainfall & Duration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
        {/* Rainfall Intensity Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              <span>Rainfall Intensity</span>
            </div>
            <span className="text-sm font-bold font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
              {rainfall} mm/hr
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="160"
            step="5"
            value={rainfall}
            onChange={(e) => setRainfall(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>10 mm/h (Light)</span>
            <span>65 mm/h</span>
            <span>160 mm/h (Extreme)</span>
          </div>
        </div>

        {/* Storm Duration Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Storm Duration</span>
            </div>
            <span className="text-sm font-bold font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
              {duration.toFixed(1)} hrs
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="4.0"
            step="0.5"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.5h</span>
            <span>2.0h (Standard)</span>
            <span>4.0h</span>
          </div>
        </div>
      </div>

      {/* Drainage Chokepoints Intervention */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldX className="w-4 h-4 text-rose-400" />
            <span>Simulate Culvert Blockage</span>
          </label>
          {activeBlockedCount > 0 && (
            <button
              onClick={onClearBlockages}
              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All ({activeBlockedCount})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onBlockHotspotDrain('ecospace_orr')}
            className="text-xs bg-slate-800 hover:bg-slate-750 p-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-left"
          >
            <span className="block font-medium">EcoSpace ORR</span>
            <span className="text-[10px] text-slate-400">Roadside Trunk</span>
          </button>

          <button
            onClick={() => onBlockHotspotDrain('bellandur_inlet')}
            className="text-xs bg-slate-800 hover:bg-slate-750 p-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-left"
          >
            <span className="block font-medium">Bellandur Inlet</span>
            <span className="text-[10px] text-slate-400">K-100 Confluence</span>
          </button>

          <button
            onClick={() => onBlockHotspotDrain('rainbow_drive')}
            className="text-xs bg-slate-800 hover:bg-slate-750 p-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-left"
          >
            <span className="block font-medium">Rainbow Drive</span>
            <span className="text-[10px] text-slate-400">Sarjapur Culvert</span>
          </button>
        </div>
      </div>

      {/* Execution Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Physical 2D Simulation Button */}
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-cyan-600/25 transition cursor-pointer"
        >
          {isSimulating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Simulating Hydrodynamic Flow...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run Physical Simulation</span>
            </>
          )}
        </button>

        {/* Instant AI Surrogate Early Warning */}
        <button
          onClick={onRunMlPredict}
          disabled={isMlPredicting}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-600/25 transition cursor-pointer"
        >
          {isMlPredicting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Querying ML Surrogate...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>Instant AI Early Warning (&lt;10ms)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
