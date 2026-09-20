import React, { useState } from 'react';
import {
  X,
  GitCompare,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Droplet,
  Users,
  Maximize2,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function ScenarioComparisonModal({
  isOpen,
  onClose,
  currentRainfall,
  currentDuration,
  currentBlockedDrains,
}) {
  const [comparing, setComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [scenarioBRain, setScenarioBRain] = useState(currentRainfall > 80 ? currentRainfall : 90);
  const [blockEcoSpaceB, setBlockEcoSpaceB] = useState(true);

  if (!isOpen) return null;

  const handleRunComparison = async () => {
    setComparing(true);
    try {
      // Scenario A: current rainfall, clear or current blockages
      // Scenario B: customized rainfall and additional blocked culverts
      const blockedB = [...currentBlockedDrains];
      if (blockEcoSpaceB) {
        // EcoSpace coordinates
        blockedB.push([41, 64]);
        blockedB.push([42, 64]);
      }

      const payload = {
        scenario_a: {
          rainfall_mm_hr: currentRainfall,
          duration_hours: currentDuration,
          snapshot_interval_min: 30,
          blocked_drains: currentBlockedDrains,
          downsample: 2,
        },
        scenario_b: {
          rainfall_mm_hr: scenarioBRain,
          duration_hours: currentDuration,
          snapshot_interval_min: 30,
          blocked_drains: blockedB,
          downsample: 2,
        },
      };

      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Comparison failed');
      const data = await res.json();
      setComparisonData(data);
    } catch (err) {
      console.error('Error running scenario comparison:', err);
    } finally {
      setComparing(false);
    }
  };

  const delta = comparisonData?.delta;
  const sumA = comparisonData?.scenario_a?.summary;
  const sumB = comparisonData?.scenario_b?.summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base m-0">Scenario Comparison Engine</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scenario A Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs uppercase font-bold text-cyan-400 block mb-1">
                Scenario A (Baseline)
              </span>
              <div className="text-sm font-semibold text-slate-200">
                Rainfall: {currentRainfall} mm/hr ({currentDuration}h)
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Blocked Drains: {currentBlockedDrains?.length || 0} active
              </div>
            </div>

            {/* Scenario B Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs uppercase font-bold text-amber-400 block mb-1">
                Scenario B (Alternative Stress Test)
              </span>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-xs text-slate-300">Rainfall:</span>
                <input
                  type="number"
                  min="20"
                  max="160"
                  step="5"
                  value={scenarioBRain}
                  onChange={(e) => setScenarioBRain(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-mono w-24"
                />
              </div>
              <label className="flex items-center gap-2 mt-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockEcoSpaceB}
                  onChange={(e) => setBlockEcoSpaceB(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500"
                />
                <span>Simulate EcoSpace Culvert Failure</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={comparing}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            {comparing ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                <span>Simulating Both Scenarios Side-by-Side...</span>
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4" />
                <span>Compute Scenario Delta</span>
              </>
            )}
          </button>

          {/* Comparison Output Results */}
          {comparisonData && (
            <div className="flex flex-col gap-4 border-t border-slate-800 pt-4">
              <h4 className="font-bold text-slate-200 text-sm m-0">Comparative Hydro-Impact</h4>

              {/* Delta KPI Highlight Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Δ Flooded Extent</span>
                  <div className={`text-lg font-bold font-mono ${delta.flooded_area_delta_km2 >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {delta.flooded_area_delta_km2 >= 0 ? '+' : ''}
                    {delta.flooded_area_delta_km2.toFixed(2)} km²
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Δ Peak Depth</span>
                  <div className={`text-lg font-bold font-mono ${delta.max_depth_delta_m >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {delta.max_depth_delta_m >= 0 ? '+' : ''}
                    {(delta.max_depth_delta_m * 100).toFixed(1)} cm
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Δ Population Exposed</span>
                  <div className={`text-lg font-bold font-mono ${delta.pop_affected_delta >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {delta.pop_affected_delta >= 0 ? '+' : ''}
                    {delta.pop_affected_delta.toLocaleString()}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Δ Critical Population</span>
                  <div className={`text-lg font-bold font-mono ${delta.pop_critical_delta >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {delta.pop_critical_delta >= 0 ? '+' : ''}
                    {delta.pop_critical_delta.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Side by Side Detailed Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Hydrological Metric</th>
                      <th className="p-3 text-cyan-300">Scenario A</th>
                      <th className="p-3 text-amber-300">Scenario B</th>
                      <th className="p-3 text-rose-300">Impact Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    <tr>
                      <td className="p-3 font-medium">Rainfall Intensity</td>
                      <td className="p-3 font-mono">{sumA.rainfall_mm_hr} mm/h</td>
                      <td className="p-3 font-mono">{sumB.rainfall_mm_hr} mm/h</td>
                      <td className="p-3 font-mono">+{sumB.rainfall_mm_hr - sumA.rainfall_mm_hr} mm/h</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Peak Flooded Area</td>
                      <td className="p-3 font-mono">{sumA.peak_flooded_area_km2} km²</td>
                      <td className="p-3 font-mono">{sumB.peak_flooded_area_km2} km²</td>
                      <td className="p-3 font-mono text-rose-400">+{delta.flooded_area_delta_km2} km²</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Max Water Depth</td>
                      <td className="p-3 font-mono">{sumA.max_water_depth_m} m</td>
                      <td className="p-3 font-mono">{sumB.max_water_depth_m} m</td>
                      <td className="p-3 font-mono text-rose-400">+{delta.max_depth_delta_m} m</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Population Affected</td>
                      <td className="p-3 font-mono">{sumA.total_population_affected.toLocaleString()}</td>
                      <td className="p-3 font-mono">{sumB.total_population_affected.toLocaleString()}</td>
                      <td className="p-3 font-mono text-rose-400">+{delta.pop_affected_delta.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Time to First Critical</td>
                      <td className="p-3 font-mono">{sumA.time_to_first_critical_min > 0 ? `${sumA.time_to_first_critical_min} min` : 'None'}</td>
                      <td className="p-3 font-mono">{sumB.time_to_first_critical_min > 0 ? `${sumB.time_to_first_critical_min} min` : 'None'}</td>
                      <td className="p-3 font-mono text-amber-400">
                        {delta.time_to_critical_delta_min !== 0 ? `${delta.time_to_critical_delta_min} min earlier` : 'Unchanged'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
