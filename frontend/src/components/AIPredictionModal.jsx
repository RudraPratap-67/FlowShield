import React from 'react';
import {
  X,
  Sparkles,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Clock,
  Droplet,
  Users,
  Maximize2,
} from 'lucide-react';

export default function AIPredictionModal({
  isOpen,
  onClose,
  predictionData,
}) {
  if (!isOpen || !predictionData) return null;

  const {
    risk_tier = 'LOW_NORMAL',
    inference_time_ms = 1.5,
    predictions = {},
    hotspots = [],
    rainfall_mm_hr = 50,
    duration_hours = 2.0,
    blocked_drains_count = 0,
  } = predictionData;

  const isCritical = risk_tier === 'CRITICAL_ALERT';
  const isHigh = risk_tier === 'HIGH_ALERT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-purple-500/40 w-full max-w-2xl rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-purple-950/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white text-base m-0">
              ML Surrogate Early-Warning Inference
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md font-mono border border-purple-500/30">
              <Zap className="w-3 h-3 text-purple-400" />
              <span>Inference: {inference_time_ms} ms</span>
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          {/* Risk Tier Hero Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isCritical
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : isHigh
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isCritical ? 'bg-rose-500/30' : isHigh ? 'bg-amber-500/30' : 'bg-emerald-500/20'
                }`}
              >
                {isCritical ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                  ML Surrogate Classification
                </span>
                <h4 className="font-extrabold text-base m-0">{risk_tier.replace('_', ' ')}</h4>
              </div>
            </div>

            {predictions.time_to_first_critical_min > 0 && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Predicted Lead Time</span>
                <span className="text-xl font-black font-mono text-rose-400">
                  {predictions.time_to_first_critical_min} min
                </span>
              </div>
            )}
          </div>

          {/* Model Explanation Note */}
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-semibold text-purple-300">Physics-Trained Surrogate:</span> This tree-ensemble surrogate model was trained directly on 2D hydrodynamic simulation runs. It infers peak flood depths and time-to-critical thresholds in under 2 milliseconds for instantaneous emergency triage.
          </p>

          {/* Predicted Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Predicted Peak Depth</span>
              <div className="text-lg font-bold font-mono text-purple-300">
                {predictions.max_water_depth_m} m
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Predicted Flooded Area</span>
              <div className="text-lg font-bold font-mono text-purple-300">
                {predictions.peak_flooded_area_km2} km²
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Exposed Population</span>
              <div className="text-lg font-bold font-mono text-purple-300">
                {predictions.total_population_affected?.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">High Hazard Pop</span>
              <div className="text-lg font-bold font-mono text-purple-300">
                {predictions.total_population_critical?.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Hotspots Predictions Table */}
          <div>
            <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wide mb-2">
              Hotspot Inundation Forecast
            </h5>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Hotspot</th>
                    <th className="p-2.5">Predicted Depth</th>
                    <th className="p-2.5">Critical Threshold</th>
                    <th className="p-2.5">Alert Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                  {hotspots.map((h) => (
                    <tr key={h.id}>
                      <td className="p-2.5 font-medium text-slate-200">{h.name}</td>
                      <td className="p-2.5 font-mono text-purple-300">{h.predicted_depth_m} m</td>
                      <td className="p-2.5 font-mono text-slate-400">{h.critical_depth_m} m</td>
                      <td className="p-2.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            h.status === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : h.status === 'WARNING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
