import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Activity,
} from 'lucide-react';

export default function TimelineScrubber({
  snapshots,
  currentStep,
  setCurrentStep,
  showPeakView,
  setShowPeakView,
  stormDurationHours,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 1x, 2x, 4x

  const totalSteps = snapshots ? snapshots.length : 0;
  const currentSnapshot = snapshots && snapshots[currentStep] ? snapshots[currentStep] : null;
  const currentTimeMin = currentSnapshot ? currentSnapshot.time_minutes : 0;

  // Auto-play animation timer
  useEffect(() => {
    let interval = null;
    if (isPlaying && totalSteps > 0) {
      const delay = 1200 / playSpeed;
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalSteps, playSpeed, setCurrentStep]);

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center text-slate-400 text-xs">
        Run simulation to load flood progression timeline.
      </div>
    );
  }

  const hours = Math.floor(currentTimeMin / 60);
  const mins = Math.floor(currentTimeMin % 60);
  const formattedTime = `T + ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} hr`;
  const isRaining = currentTimeMin <= (stormDurationHours * 60);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      {/* Top Header: Current Time & Mode Toggles */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-mono font-bold text-slate-100 text-sm">{formattedTime}</span>
          </div>

          <span
            className={`text-xs px-2 py-0.5 rounded-md font-semibold uppercase ${isRaining
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
          >
            {isRaining ? 'Storm In Progress' : 'Post-Storm Drainage'}
          </span>
        </div>

        {/* View Mode Toggle: Time Progression vs Peak Inundation */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setShowPeakView(false)}
            className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${!showPeakView
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            Time Slice
          </button>
          <button
            onClick={() => setShowPeakView(true)}
            className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1 cursor-pointer ${showPeakView
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Peak Extent</span>
          </button>
        </div>
      </div>

      {/* Scrubber Slider */}
      <div className="relative flex items-center gap-3">
        <input
          type="range"
          min="0"
          max={totalSteps - 1}
          value={currentStep}
          onChange={(e) => {
            setCurrentStep(Number(e.target.value));
            setShowPeakView(false);
          }}
          className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
        />
      </div>

      {/* Control Buttons & Playback Speed */}
      <div className="flex items-center justify-between pt-1">
        {/* Playback Transport Controls */}
        <div className="flex items-center gap-2">
          {/* Reset */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(0);
            }}
            title="Reset to T=0"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Step Back */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((prev) => Math.max(0, prev - 1));
            }}
            disabled={currentStep === 0}
            title="Previous Snapshot"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/60"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => {
              if (currentStep >= totalSteps - 1) {
                setCurrentStep(0);
              }
              setIsPlaying(!isPlaying);
              setShowPeakView(false);
            }}
            title={isPlaying ? 'Pause' : 'Play Simulation'}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-600/30"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-white" />
                <span className="text-xs">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span className="text-xs">Play</span>
              </>
            )}
          </button>

          {/* Step Forward */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
            }}
            disabled={currentStep >= totalSteps - 1}
            title="Next Snapshot"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/60"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
          <span className="text-slate-500 text-[11px] mr-1">Speed:</span>
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaySpeed(spd)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition cursor-pointer ${playSpeed === spd
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
