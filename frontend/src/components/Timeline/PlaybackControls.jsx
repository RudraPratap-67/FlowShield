/**
 * FlowShield - PlaybackControls Component
 * Controls simulation frame playback, pause, reset, and speed multiplier.
 */

import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  FastForward,
} from "lucide-react";

export function PlaybackControls({
  isPlaying,
  onPlay,
  onPause,
  onRestart,
  onStepForward,
  onStepBackward,
  playbackSpeed,
  onChangeSpeed,
  disabled = false,
}) {
  const speeds = [1.0, 2.0, 4.0];

  return (
    <div className="flex items-center gap-2">
      {/* Step Back */}
      <button
        onClick={onStepBackward}
        disabled={disabled}
        className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors border border-slate-700/50"
        title="Previous Frame"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Main Play / Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={disabled}
        className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-950/60 disabled:opacity-40 transition-all active:scale-95"
        title={isPlaying ? "Pause" : "Play Animation"}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Step Forward */}
      <button
        onClick={onStepForward}
        disabled={disabled}
        className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors border border-slate-700/50"
        title="Next Frame"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Restart */}
      <button
        onClick={onRestart}
        disabled={disabled}
        className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors border border-slate-700/50 ml-1"
        title="Restart to t=0"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Speed Multiplier Pill */}
      <div className="flex items-center ml-2 bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/50">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onChangeSpeed(s)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              playbackSpeed === s
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
