import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import {
  AlertTriangle,
  Users,
  Maximize2,
  Droplet,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export default function AnalyticsPanel({
  simulationResult,
  currentSnapshot,
  summary,
}) {
  const [activeTab, setActiveTab] = useState('hydrographs'); // 'hydrographs' or 'impact'

  if (!simulationResult) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-3 text-cyan-400 border border-cyan-500/20">
          <Droplet className="w-6 h-6" />
        </div>
        <h4 className="font-semibold text-slate-200 mb-1">Awaiting Simulation</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          Run a physical 2D simulation to inspect time-to-critical warnings, flood hydrographs, and affected population metrics.
        </p>
      </div>
    );
  }

  const {
    peak_flooded_area_km2 = 0,
    max_water_depth_m = 0,
    total_population_affected = 0,
    total_population_critical = 0,
    time_to_first_critical_min = -1,
  } = summary || {};

  // Build Hydrograph chart data from hotspot_timelines
  const timelines = simulationResult.hotspot_timelines || {};
  const snapshots = simulationResult.snapshots || [];

  // Create chart array keyed by time_min
  const hydrographData = snapshots.map((s) => {
    const row = { time: `${s.time_min}m` };
    if (s.hotspots) {
      s.hotspots.forEach((h) => {
        row[h.name] = h.depth_m;
      });
    }
    return row;
  });

  // Impact progression data
  const impactData = snapshots.map((s) => ({
    time: `${s.time_min}m`,
    area_km2: s.flooded_area_km2,
    pop_affected: s.population_affected,
    pop_critical: s.population_critical,
    max_depth: s.max_depth_m,
  }));

  const hasCriticalWarning = time_to_first_critical_min > 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-5">
      {/* Early Warning Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
          hasCriticalWarning
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              hasCriticalWarning ? 'bg-rose-500/30 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {hasCriticalWarning ? (
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider opacity-80 block">
              Early Warning Status
            </span>
            <h4 className="font-bold text-sm m-0">
              {hasCriticalWarning
                ? `CRITICAL THRESHOLD BREACH AT T + ${time_to_first_critical_min} MIN`
                : 'NO CRITICAL FLOOD THRESHOLD BREACH DETECTED'}
            </h4>
          </div>
        </div>

        {hasCriticalWarning && (
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase">Lead Time to Critical</span>
            <span className="text-xl font-black font-mono text-rose-400">
              {time_to_first_critical_min}m
            </span>
          </div>
        )}
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Peak Inundation Depth */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Peak Depth</span>
            <Droplet className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {max_water_depth_m.toFixed(2)} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
          <span className="text-[10px] text-slate-500">Maximum grid flood head</span>
        </div>

        {/* Peak Flooded Area */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Flooded Extent</span>
            <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-300">
            {peak_flooded_area_km2.toFixed(2)} <span className="text-xs font-normal text-slate-400">km²</span>
          </div>
          <span className="text-[10px] text-slate-500">Area inundated &gt; 5 cm</span>
        </div>

        {/* Population at Risk */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Population Exposed</span>
            <Users className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">
            {total_population_affected.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">Exposed residents &gt; 15 cm</span>
        </div>

        {/* Critical Population */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>High Hazard Exposure</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">
            {total_population_critical.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">Severe hazard &gt; 30 cm</span>
        </div>
      </div>

      {/* Tabs for Recharts Hydrographs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('hydrographs')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'hydrographs'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hotspot Hydrographs (Water Depth vs Time)
            </button>
            <button
              onClick={() => setActiveTab('impact')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'impact'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Population & Area Inundation Curve
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-64 w-full bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
          {activeTab === 'hydrographs' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hydrographData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit="m" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                {/* Critical threshold guideline */}
                <ReferenceLine y={0.45} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical 0.45m', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="RMZ EcoSpace / ORR" stroke="#f97316" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Rainbow Drive Layout" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Koramangala 4th Block" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ST Bed / Bellandur Inlet" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={impactData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area type="monotone" dataKey="pop_affected" name="Exposed Population" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                <Area type="monotone" dataKey="pop_critical" name="High Risk Population" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
