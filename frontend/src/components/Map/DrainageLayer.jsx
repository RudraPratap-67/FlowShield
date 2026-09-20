/**
 * FlowShield - DrainageLayer Component
 * Visualizes primary stormwater drains and interactive blockable culverts.
 */

import React from "react";
import { CircleMarker, Tooltip } from "react-leaflet";

export function DrainageLayer({
  culverts = [],
  blockedDrains = [],
  onToggleBlock,
  visible = true,
}) {
  if (!visible) return null;

  return (
    <>
      {culverts.map((c) => {
        const isBlocked = blockedDrains.some(
          ([r, col]) => r === c.grid_row && col === c.grid_col
        );

        return (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lon]}
            radius={isBlocked ? 8 : 6}
            pathOptions={{
              color: isBlocked ? "#ef4444" : "#06b6d4",
              fillColor: isBlocked ? "#dc2626" : "#0891b2",
              fillOpacity: 0.9,
              weight: isBlocked ? 3 : 1.5,
              dashArray: isBlocked ? "3, 3" : null,
            }}
            eventHandlers={{
              click: () => onToggleBlock && onToggleBlock(c.grid_row, c.grid_col),
            }}
          >
            <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
              <div className="p-1 text-xs font-sans">
                <div className="font-bold flex items-center gap-1.5 text-slate-100">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isBlocked ? "bg-red-500 animate-ping" : "bg-cyan-400"
                    }`}
                  />
                  {c.name}
                </div>
                <div className="text-slate-300 mt-1">
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      isBlocked ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {isBlocked ? "BLOCKED / CHOKED" : "OPERATIONAL"}
                  </span>
                </div>
                <div className="text-slate-400 text-[10px]">
                  Capacity: {c.capacity_mm_hr} mm/hr
                </div>
                <div className="text-amber-300 text-[10px] mt-1 italic">
                  Click to {isBlocked ? "unblock" : "block"} culvert
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
