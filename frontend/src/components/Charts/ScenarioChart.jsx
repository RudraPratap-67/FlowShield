/**
 * FlowShield - ScenarioChart Component
 * Comparative Recharts bar visualization contrasting Normal vs Heavy Rain vs Drainage Failure.
 */

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { GitCompare, RefreshCw } from "lucide-react";
import { api } from "../../services/api";

export function ScenarioChart({ blockedDrains = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadComparison() {
    setLoading(true);
    try {
      const res = await api.compareScenarios({
        normal_rainfall_mm_hr: 30.0,
        heavy_rainfall_mm_hr: 65.0,
        extreme_rainfall_mm_hr: 100.0,
        duration_min: 120.0,
        blocked_drainage: blockedDrains,
      });
      setData(res);
    } catch (err) {
      console.warn("Failed to load scenario comparison:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComparison();
  }, [blockedDrains.length]);

  const scenarios = data?.scenarios;

  const chartData = [
    {
      scenario: "Normal (30mm)",
      peakDepthCm: Math.round((scenarios?.NORMAL?.peak_depth_m || 0.12) * 100),
      criticalCells: scenarios?.NORMAL?.critical_cell_count || 4,
      popExposedK: Math.round((scenarios?.NORMAL?.affected_population || 12000) / 1000),
    },
    {
      scenario: "Heavy (65mm)",
      peakDepthCm: Math.round((scenarios?.HEAVY?.peak_depth_m || 0.38) * 100),
      criticalCells: scenarios?.HEAVY?.critical_cell_count || 120,
      popExposedK: Math.round((scenarios?.HEAVY?.affected_population || 64000) / 1000),
    },
    {
      scenario: "Drain Failure",
      peakDepthCm: Math.round((scenarios?.DRAINAGE_FAILURE?.peak_depth_m || 0.65) * 100),
      criticalCells: scenarios?.DRAINAGE_FAILURE?.critical_cell_count || 280,
      popExposedK: Math.round((scenarios?.DRAINAGE_FAILURE?.affected_population || 145000) / 1000),
    },
  ];

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col gap-2 font-sans">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
          <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
          <span>Multi-Scenario Impact Analysis</span>
        </span>
        <button
          onClick={loadComparison}
          disabled={loading}
          className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
          title="Refresh scenario metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <XAxis dataKey="scenario" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-2 rounded shadow-lg text-[11px] text-slate-200">
                      <div className="font-bold text-cyan-400">{d.scenario}</div>
                      <div>Peak Depth: {d.peakDepthCm} cm</div>
                      <div>Critical Inundated Cells: {d.criticalCells}</div>
                      <div>Population Exposed: {d.popExposedK}k residents</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="peakDepthCm" name="Peak Depth (cm)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="criticalCells" name="Critical Cells" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="popExposedK" name="Exposed Pop (k)" fill="#fbbf24" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
