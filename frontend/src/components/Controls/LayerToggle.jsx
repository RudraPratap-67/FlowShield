/**
 * FlowShield - LayerToggle Component
 * Quick toggle toolbar for map geospatial layers.
 */

import React from "react";
import {
  Layers,
  Droplets,
  ShieldAlert,
  GitFork,
  Waves,
  Building2,
  Compass,
} from "lucide-react";

export function LayerToggle({ activeLayers, onToggleLayer }) {
  const layerButtons = [
    { key: "floodDepth", label: "Flood Depth", icon: Droplets },
    { key: "riskZones", label: "Risk Zones", icon: ShieldAlert },
    { key: "drainage", label: "Drainage", icon: GitFork },
    { key: "lakes", label: "Lakes", icon: Waves },
    { key: "infrastructure", label: "Infrastructure", icon: Building2 },
    { key: "flowArrows", label: "Flow Vectors", icon: Compass },
  ];

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-lg flex items-center justify-between gap-2 overflow-x-auto font-sans text-xs">
      <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider pl-1 pr-2 border-r border-slate-800 shrink-0">
        <Layers className="w-4 h-4 text-cyan-400" />
        <span>Layers:</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {layerButtons.map((l) => {
          const Icon = l.icon;
          const isActive = activeLayers[l.key];
          return (
            <button
              key={l.key}
              onClick={() => onToggleLayer(l.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isActive
                  ? "bg-cyan-950/70 border-cyan-500/70 text-cyan-300 shadow-sm shadow-cyan-950"
                  : "bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{l.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
