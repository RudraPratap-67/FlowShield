/**
 * FlowShield - WarningCard Component
 * Displays a single infrastructure node alert status, simulated depth, and time-to-critical countdown.
 */

import React from "react";
import { AlertCircle, AlertTriangle, ShieldCheck, Clock } from "lucide-react";

export function WarningCard({ warning }) {
  if (!warning) return null;

  const isCritical = warning.status === "CRITICAL";
  const isWarning = warning.status === "WARNING";

  const StatusIcon = isCritical
    ? AlertCircle
    : isWarning
    ? AlertTriangle
    : ShieldCheck;

  const statusBadge = isCritical
    ? "bg-red-500/20 text-red-300 border-red-500/30"
    : isWarning
    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

  return (
    <div
      className={`p-3 rounded-lg border transition-all text-xs font-sans ${
        isCritical
          ? "bg-red-950/30 border-red-800/60"
          : isWarning
          ? "bg-amber-950/20 border-amber-800/50"
          : "bg-slate-800/30 border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-bold text-slate-100 truncate">{warning.name}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0 ${statusBadge}`}>
          {warning.status}
        </span>
      </div>

      <div className="flex items-center justify-between text-slate-400 mt-1.5">
        <span>Peak Depth:</span>
        <span className="font-semibold text-slate-200">
          {warning.peak_depth_m.toFixed(2)} m
        </span>
      </div>

      <div className="flex items-center justify-between mt-1 text-[11px]">
        <span className="text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>Onset Time:</span>
        </span>
        {warning.time_to_critical_min !== null && warning.time_to_critical_min !== undefined ? (
          <span className="font-bold text-red-400">
            Critical in {Math.round(warning.time_to_critical_min)} min
          </span>
        ) : (
          <span className="text-emerald-400 text-[10px]">
            Not expected critical
          </span>
        )}
      </div>
    </div>
  );
}
