/**
 * FlowShield - TimeSlider Component
 * Timeline scrubber showing storm progression, frame index, and critical threshold milestones.
 */

import React from "react";
import { Clock } from "lucide-react";

export function TimeSlider({
  currentFrameIndex,
  totalFrames,
  currentMinutes,
  totalMinutes = 180,
  onSeek,
  disabled = false,
}) {
  const percentage = totalFrames > 1 ? (currentFrameIndex / (totalFrames - 1)) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col gap-1.5 font-sans">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Timeline:</span>
          <span className="font-bold text-cyan-400 font-mono text-sm ml-1">
            {currentMinutes} min
          </span>
          <span className="text-slate-500 font-mono">
            / {totalMinutes} min
          </span>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Frame {totalFrames > 0 ? currentFrameIndex + 1 : 0} of {totalFrames}
        </div>
      </div>

      {/* Slider Track */}
      <div className="relative flex items-center">
        <input
          type="range"
          min="0"
          max={Math.max(0, totalFrames - 1)}
          value={currentFrameIndex}
          onChange={(e) => onSeek(Number(e.target.value))}
          disabled={disabled || totalFrames <= 1}
          className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>
    </div>
  );
}
