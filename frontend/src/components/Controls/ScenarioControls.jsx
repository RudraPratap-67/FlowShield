/**
 * FlowShield - ScenarioControls Component
 * Presets, simulation trigger, and drainage block mode switch.
 */

import React from "react";
import {
  CloudRain,
  CloudLightning,
  AlertTriangle,
  OctagonX,
  Play,
  RotateCcw,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { SCENARIO_PRESETS } from "../../hooks/useSimulation";

export function ScenarioControls({
  scenario,
  onApplyPreset,
  onRunSimulation,
  isSimulating,
  blockedDrainsCount = 0,
  onClearBlockedDrains,
}) {
  const presets = [
    { key: "NORMAL", ...SCENARIO_PRESETS.NORMAL, icon: CloudRain },
    { key: "HEAVY", ...SCENARIO_PRESETS.HEAVY, icon: CloudLightning },
    { key: "EXTREME", ...SCENARIO_PRESETS.EXTREME, icon: AlertTriangle },
    { key: "DRAINAGE_FAILURE", ...SCENARIO_PRESETS.DRAINAGE_FAILURE, icon: OctagonX },
  ];

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3 font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Simulation Scenarios</span>
        </h3>
        {blockedDrainsCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
              {blockedDrainsCount} Culverts Blocked
            </span>
            <button
              onClick={onClearBlockedDrains}
              className="text-[11px] text-slate-400 hover:text-red-300 underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Preset Buttons Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {presets.map((p) => {
          const Icon = p.icon;
          const isSelected = scenario === p.id;
          return (
            <button
              key={p.key}
              onClick={() => onApplyPreset(p.key)}
              className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? "bg-cyan-950/60 border-cyan-500/80 shadow-md shadow-cyan-950/40"
                  : "bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-semibold text-xs text-slate-200">
                  {p.name}
                </span>
                <Icon
                  className={`w-4 h-4 ${
                    isSelected ? "text-cyan-400" : "text-slate-400"
                  }`}
                />
              </div>
              <div className="text-[11px] text-slate-400">
                {p.intensity_mm_hr} mm/hr • {p.duration_min}m
              </div>
            </button>
          );
        })}
      </div>

      {/* Run Simulation Master Action */}
      <div className="mt-1 flex items-center gap-3">
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all shadow-lg ${
            isSimulating
              ? "bg-cyan-800 cursor-not-allowed opacity-80 text-cyan-200"
              : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-950/50 hover:shadow-cyan-900/60 active:scale-[0.99]"
          }`}
        >
          {isSimulating ? (
            <>
              <div className="w-4 h-4 border-2 border-cyan-200 border-t-transparent rounded-full animate-spin" />
              <span>Simulating 2D Hydrodynamics...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Hydrodynamic Simulation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
