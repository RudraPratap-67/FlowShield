import React from 'react';
import { ShieldAlert, Activity, Cpu, CloudRain, GitCompare, RefreshCw } from 'lucide-react';

export default function Header({
  isSimulating,
  isMlPredicting,
  activeBlockedCount,
  onOpenCompare,
  backendOnline,
}) {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Catchment Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white m-0">FLOW SHIELD</h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Bengaluru Hydro-Twin
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0">
              Koramangala – Bellandur – Varthur Valley Flood Simulation & Early Warning
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Engine Status Badges */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <div className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-medium">
              {backendOnline ? 'API Connected' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>2D Hydro Physics</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>ML Surrogate</span>
          </div>

          {activeBlockedCount > 0 && (
            <div className="flex items-center gap-1.5 bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/30 text-xs font-semibold text-rose-300 animate-pulse">
              <span>{activeBlockedCount} Drain{activeBlockedCount > 1 ? 's' : ''} Blocked</span>
            </div>
          )}

          {/* Scenario Comparison Modal Trigger */}
          <button
            onClick={onOpenCompare}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition font-medium text-xs shadow-sm cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5 text-amber-400" />
            <span>Compare Scenarios</span>
          </button>
        </div>
      </div>
    </header>
  );
}
