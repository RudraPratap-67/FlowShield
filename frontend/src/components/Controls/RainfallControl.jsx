/**
 * FlowShield - RainfallControl Component
 * Interactive sliders for rainfall intensity (mm/hr) and storm duration (min).
 */

import React from "react";
import { CloudRain, Clock, Gauge } from "lucide-react";

export function RainfallControl({
  intensity,
  onChangeIntensity,
  duration,
  onChangeDuration,
  forecast,
}) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3 font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-cyan-400" />
          <span>Precipitation Forcing</span>
        </h3>
        {forecast && (
          <span className="text-[10px] text-cyan-300/80 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
            {forecast.source.includes("Open-Meteo") ? "Live Open-Meteo" : "Monsoon Cloudburst"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Intensity Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rainfall Intensity</span>
            </span>
            <span className="font-bold text-slate-100 text-sm font-mono">
              {intensity} <span className="text-xs font-normal text-slate-400">mm/hr</span>
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            step="5"
            value={intensity}
            onChange={(e) => onChangeIntensity(Number(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Light (20)</span>
            <span>Heavy (65)</span>
            <span>Cloudburst (120+)</span>
          </div>
        </div>

        {/* Duration Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Storm Duration</span>
            </span>
            <span className="font-bold text-slate-100 text-sm font-mono">
              {duration} <span className="text-xs font-normal text-slate-400">min</span> ({Math.round((duration / 60) * 10) / 10}h)
            </span>
          </div>
          <input
            type="range"
            min="30"
            max="360"
            step="15"
            value={duration}
            onChange={(e) => onChangeDuration(Number(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>30m</span>
            <span>2 hours</span>
            <span>6 hours</span>
          </div>
        </div>
      </div>
    </div>
  );
}
