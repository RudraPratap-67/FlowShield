/**
 * FlowShield - InfrastructureLayer Component
 * Visualizes hospitals, tech parks, arterial junctions, and transit nodes.
 */

import React from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import { getRiskClass } from "../../utils/mapUtils";

export function InfrastructureLayer({
  infrastructure = [],
  warnings = [],
  visible = true,
  onSelectNode,
}) {
  if (!visible || !infrastructure) return null;

  return (
    <>
      {infrastructure.map((node) => {
        // Find latest simulated status from warnings
        const warning = warnings?.find((w) => w.id === node.id);
        const depth = warning ? warning.peak_depth_m : 0.0;
        const status = warning ? warning.status : getRiskClass(depth);
        const timeToCrit = warning ? warning.time_to_critical_min : null;

        const isCritical = status === "CRITICAL";
        const isWarning = status === "WARNING";

        const badgeColor = isCritical
          ? "#ef4444"
          : isWarning
          ? "#f59e0b"
          : "#10b981";

        return (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lon]}
            radius={isCritical ? 10 : 8}
            pathOptions={{
              color: badgeColor,
              fillColor: badgeColor,
              fillOpacity: 0.85,
              weight: 2.5,
            }}
            eventHandlers={{
              click: () => onSelectNode && onSelectNode(node, warning),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div className="p-1.5 text-xs font-sans min-w-[170px]">
                <div className="font-bold text-slate-100 flex items-center justify-between gap-2">
                  <span>{node.name}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                      isCritical
                        ? "bg-red-500/30 text-red-300"
                        : isWarning
                        ? "bg-amber-500/30 text-amber-300"
                        : "bg-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] capitalize mt-0.5">
                  Type: {node.type?.replace("_", " ")}
                </div>
                <div className="mt-1 text-slate-200">
                  Simulated Peak: <span className="font-semibold">{depth.toFixed(2)} m</span>
                </div>
                {timeToCrit !== null && timeToCrit !== undefined ? (
                  <div className="text-red-400 font-medium text-[11px] mt-0.5">
                    Critical in {Math.round(timeToCrit)} min
                  </div>
                ) : (
                  <div className="text-emerald-400 text-[10px] mt-0.5">
                    Not expected to become critical
                  </div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
