/**
 * FlowShield - CriticalList Component
 * Displays sorted list of critical hotspots ordered by time to critical arrival.
 */

import React from "react";
import { WarningCard } from "./WarningCard";
import { AlertOctagon } from "lucide-react";

export function CriticalList({ warnings = [] }) {
  if (!warnings || warnings.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-800 text-center text-xs text-slate-400">
        Run simulation to compute early warning alerts.
      </div>
    );
  }

  // Filter or sort: critical and warning items first
  const activeAlerts = warnings.filter((w) => w.status !== "SAFE");
  const displayItems = activeAlerts.length > 0 ? activeAlerts : warnings.slice(0, 4);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
        <span className="flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          <span>Priority Alert Zones</span>
        </span>
        <span className="text-[10px] text-slate-500">
          Sorted by arrival time
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
        {displayItems.map((item) => (
          <WarningCard key={item.id} warning={item} />
        ))}
      </div>
    </div>
  );
}
