/**
 * FlowShield - WaterLevelChart Component
 * Recharts time-series tracking flood depth progression and critical cells over the simulation duration.
 */

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Activity } from "lucide-react";

export function WaterLevelChart({ frames = [] }) {
  if (!frames || frames.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800">
        Run simulation to generate hydrodynamic water level progression.
      </div>
    );
  }

  const chartData = frames.map((f) => ({
    timeMin: Math.round(f.t_seconds / 60),
    maxDepth: Number(f.max_depth_m?.toFixed(2) || 0),
    criticalCount: f.critical_count || 0,
  }));

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col gap-2 font-sans">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Water Depth Progression</span>
        </span>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            Max Depth (m)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-red-400 inline-block" />
            Critical Line (0.30m)
          </span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="depthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timeMin"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              unit="m"
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              domain={[0, "auto"]}
              unit="m"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-2 rounded shadow-lg text-[11px] text-slate-200">
                      <div className="font-semibold text-cyan-400">
                        {data.timeMin} min
                      </div>
                      <div>Peak Depth: {data.maxDepth} m</div>
                      <div>Critical Inundated Cells: {data.criticalCount}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={0.3}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{
                value: "Critical (0.3m)",
                fill: "#ef4444",
                fontSize: 9,
                position: "insideTopRight",
              }}
            />
            <ReferenceLine
              y={0.1}
              stroke="#f59e0b"
              strokeDasharray="2 2"
              label={{
                value: "Warning (0.1m)",
                fill: "#f59e0b",
                fontSize: 9,
                position: "insideTopRight",
              }}
            />
            <Area
              type="monotone"
              dataKey="maxDepth"
              stroke="#38bdf8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#depthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
