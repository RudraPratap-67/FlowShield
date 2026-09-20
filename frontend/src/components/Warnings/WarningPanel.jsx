/**
 * FlowShield - WarningPanel Component
 * Overall system threat status, impact summary, AI vs Physics side-by-side card, and critical list.
 */

import React from "react";
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Users,
  Waves,
  Clock,
  Zap,
} from "lucide-react";
import { CriticalList } from "./CriticalList";

export function WarningPanel({
  summary,
  warnings = [],
  mlPrediction,
  isPredicting,
}) {
  const peakDepth = summary?.peak_depth_m || 0.0;
  const criticalCells = summary?.critical_cell_count || 0;
  const affectedPop = summary?.affected_population || 0;
  const firstCritMin = summary?.first_critical_min;

  // System Overall Threat Classification
  let systemStatus = "SAFE";
  if (criticalCells > 50 || peakDepth > 0.30) {
    systemStatus = "CRITICAL";
  } else if (summary?.warning_cell_count > 0 || peakDepth > 0.10) {
    systemStatus = "WARNING";
  }

  const isCritical = systemStatus === "CRITICAL";
  const isWarning = systemStatus === "WARNING";

  const StatusIcon = isCritical
    ? ShieldAlert
    : isWarning
    ? AlertTriangle
    : ShieldCheck;

  const headerBg = isCritical
    ? "bg-red-500/10 border-red-500/30 text-red-400"
    : isWarning
    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-4 font-sans text-xs">
      {/* Disclaimer Banner */}
      <div className="text-[10px] text-slate-400 border border-slate-800/80 bg-slate-950/60 p-2 rounded-lg text-center">
        Simulation-based early warning & decision-support prototype.
      </div>

      {/* System Overall Threat Banner */}
      <div className={`p-3 rounded-xl border flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-2.5">
          <StatusIcon className="w-5 h-5 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Current System Status
            </div>
            <div className="text-sm font-black tracking-wide">
              {systemStatus} ALERT LEVEL
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400">Peak Flood Depth</div>
          <div className="text-base font-black font-mono">
            {peakDepth.toFixed(2)} m
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>First Critical</span>
          </div>
          <div className="font-bold text-slate-100 text-sm font-mono">
            {firstCritMin !== null && firstCritMin !== undefined
              ? `${Math.round(firstCritMin)} min`
              : "None"}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Waves className="w-3.5 h-3.5 text-red-400" />
            <span>Critical Cells</span>
          </div>
          <div className="font-bold text-red-400 text-sm font-mono">
            {criticalCells} <span className="text-[10px] text-slate-500 font-normal">ha</span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex flex-col gap-1 col-span-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Population Exposed (Warning+)</span>
            </span>
            <span className="font-bold text-amber-300 font-mono text-sm">
              {affectedPop.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">residents</span>
            </span>
          </div>
        </div>
      </div>

      {/* Physics vs. AI Early Prediction Comparison Card */}
      {mlPrediction && (
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 flex flex-col gap-2">
          <div className="flex items-center justify-between text-indigo-300">
            <span className="font-bold text-xs flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>AI Early Prediction (XGBoost Surrogate)</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {mlPrediction.inference_time_ms}ms
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">AI Peak Depth</div>
              <div className="font-bold text-slate-100 font-mono">
                {mlPrediction.predicted_peak_depth_m?.toFixed(2)} m
              </div>
            </div>
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">AI Critical Arrival</div>
              <div className="font-bold text-slate-100 font-mono">
                {mlPrediction.predicted_time_to_critical_min !== null
                  ? `${Math.round(mlPrediction.predicted_time_to_critical_min)} min`
                  : "None"}
              </div>
            </div>
          </div>

          {/* Calibrated Risk Probabilities */}
          {mlPrediction.probabilities && (
            <div className="mt-1 flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>P(Safe): {(mlPrediction.probabilities.safe * 100).toFixed(0)}%</span>
                <span>P(Warning): {(mlPrediction.probabilities.warning * 100).toFixed(0)}%</span>
                <span>P(Critical): {(mlPrediction.probabilities.critical * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-800">
                <div
                  style={{ width: `${mlPrediction.probabilities.safe * 100}%` }}
                  className="bg-emerald-500"
                />
                <div
                  style={{ width: `${mlPrediction.probabilities.warning * 100}%` }}
                  className="bg-amber-500"
                />
                <div
                  style={{ width: `${mlPrediction.probabilities.critical * 100}%` }}
                  className="bg-red-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Critical Regions List */}
      <CriticalList warnings={warnings} />
    </div>
  );
}
