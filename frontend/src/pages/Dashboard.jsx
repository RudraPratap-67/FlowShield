/**
 * FlowShield - Main Dashboard Page
 * Integrates hydrodynamic map, timeline scrubber, rainfall controls, warning panel, and comparison charts.
 */

import React, { useState, useEffect } from "react";
import {
  Shield,
  Activity,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
} from "lucide-react";
import { useSimulation } from "../hooks/useSimulation";
import { usePlayback } from "../hooks/usePlayback";
import { FloodMap } from "../components/Map/FloodMap";
import { ScenarioControls } from "../components/Controls/ScenarioControls";
import { RainfallControl } from "../components/Controls/RainfallControl";
import { LayerToggle } from "../components/Controls/LayerToggle";
import { PlaybackControls } from "../components/Timeline/PlaybackControls";
import { TimeSlider } from "../components/Timeline/TimeSlider";
import { WarningPanel } from "../components/Warnings/WarningPanel";
import { WaterLevelChart } from "../components/Charts/WaterLevelChart";
import { ScenarioChart } from "../components/Charts/ScenarioChart";

export function Dashboard() {
  const {
    cityData,
    backendConnected,
    isSimulating,
    isPredicting,
    error,
    scenario,
    rainfallIntensity,
    setRainfallIntensity,
    rainfallDuration,
    setRainfallDuration,
    blockedDrains,
    toggleBlockDrain,
    clearBlockedDrains,
    applyPreset,
    executeSimulation,
    simulationResult,
    mlPrediction,
    forecast,
  } = useSimulation();

  const frames = simulationResult?.frames || [];
  const {
    currentFrameIndex,
    currentFrame,
    currentMinutes,
    totalFrames,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    play,
    pause,
    restart,
    stepForward,
    stepBackward,
    seekToFrame,
  } = usePlayback(frames, 4);

  // Active Map Layers
  const [activeLayers, setActiveLayers] = useState({
    floodDepth: true,
    riskZones: false,
    drainage: true,
    lakes: true,
    infrastructure: true,
    flowArrows: true,
  });

  const toggleLayer = (layerKey) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  // Run initial simulation on first load if city data is ready
  useEffect(() => {
    if (cityData && !simulationResult && !isSimulating) {
      executeSimulation();
    }
  }, [cityData]);

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-5 py-3 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/80">
            <Shield className="w-5 h-5 text-slate-950 font-black fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white uppercase">
                FlowShield
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                Vector
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive 2D Flood Simulation & ML Early-Warning System
            </p>
          </div>
        </div>

        {/* Region & Backend Status Indicators */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium">Bengaluru</span>
            <span className="text-slate-500 hidden sm:inline">
              • Koramangala-Bellandur-Varthur
            </span>
          </div>

          {cityData?.data_mode && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              cityData.data_mode === 'real' 
                ? 'bg-blue-950/40 border-blue-500/30 text-blue-400' 
                : cityData.data_mode === 'hybrid'
                  ? 'bg-yellow-950/40 border-yellow-500/30 text-yellow-400'
                  : 'bg-orange-950/40 border-orange-500/30 text-orange-400'
            }`}>
              <Layers className="w-3.5 h-3.5" />
              <span className="capitalize">{cityData.data_mode} Data</span>
            </div>
          )}

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              backendConnected
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                : "bg-red-950/40 border-red-500/30 text-red-400"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                backendConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <span>{backendConnected ? "FlowShield API Connected" : "Backend Offline"}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-5 flex flex-col gap-4 max-w-[1700px] w-full mx-auto">
        {/* Error Alert if any */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Top Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <ScenarioControls
              scenario={scenario}
              onApplyPreset={applyPreset}
              onRunSimulation={executeSimulation}
              isSimulating={isSimulating}
              blockedDrainsCount={blockedDrains.length}
              onClearBlockedDrains={clearBlockedDrains}
            />
          </div>
          <div className="lg:col-span-5">
            <RainfallControl
              intensity={rainfallIntensity}
              onChangeIntensity={setRainfallIntensity}
              duration={rainfallDuration}
              onChangeDuration={setRainfallDuration}
              forecast={forecast}
            />
          </div>
        </div>

        {/* Layer Toggle Toolbar */}
        <LayerToggle
          activeLayers={activeLayers}
          onToggleLayer={toggleLayer}
        />

        {/* Map & Warning Panel Centerpiece */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Hydrodynamic Map Section */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="h-[520px] w-full relative">
              <FloodMap
                cityData={cityData}
                currentFrame={currentFrame}
                simulationResult={simulationResult}
                blockedDrains={blockedDrains}
                onToggleBlockDrain={toggleBlockDrain}
                activeLayers={activeLayers}
              />
            </div>

            {/* Playback & Timeline Controls Bar */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col sm:flex-row items-center gap-4">
              <PlaybackControls
                isPlaying={isPlaying}
                onPlay={play}
                onPause={pause}
                onRestart={restart}
                onStepForward={stepForward}
                onStepBackward={stepBackward}
                playbackSpeed={playbackSpeed}
                onChangeSpeed={setPlaybackSpeed}
                disabled={totalFrames <= 1}
              />

              <TimeSlider
                currentFrameIndex={currentFrameIndex}
                totalFrames={totalFrames}
                currentMinutes={currentMinutes}
                totalMinutes={rainfallDuration}
                onSeek={seekToFrame}
                disabled={totalFrames <= 1}
              />
            </div>
          </div>

          {/* Right Warning & Impact Panel */}
          <div className="lg:col-span-4">
            <WarningPanel
              summary={simulationResult?.summary}
              warnings={simulationResult?.warnings}
              mlPrediction={mlPrediction}
              isPredicting={isPredicting}
            />
          </div>
        </div>

        {/* Bottom Analytics & Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <WaterLevelChart frames={frames} />
          <ScenarioChart blockedDrains={blockedDrains} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 px-5 py-3 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-slate-400">FlowShield</span> • 24-Hour Hackathon Prototype (Theme: VECTOR)
        </div>
        <div className="text-[11px] text-slate-500">
          Source of truth: 2D Hydrodynamic Physical Simulation Engine • ML Surrogate: XGBoost/Tree Ensemble
        </div>
      </footer>
    </div>
  );
}
