import { useState, useEffect, useMemo, useCallback } from 'react'
import { Settings2, Activity, Map as MapIcon, CloudRain, Droplets, Target, ShieldAlert } from 'lucide-react'
import { FloodMap } from './components/Map/FloodMap'
import TimelineScrubber from './components/TimelineScrubber'
import { RescueDashboard } from './components/RescueDashboard'

function App() {
  const [terrain, setTerrain] = useState(null)

  // App State
  const [simParams, setSimParams] = useState({
    rainfall: 50,
    duration: 120,
    dt: 5,
    scenario: 'normal',
    seed: 42,
    rainfallMode: 'constant'
  })

  const [simulation, setSimulation] = useState(null)
  const [simLoading, setSimLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dataStatus, setDataStatus] = useState(null)

  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPeakView, setShowPeakView] = useState(false)

  const [showRisk, setShowRisk] = useState(false)
  const [showVectors, setShowVectors] = useState(false)
  const [showPrimaryDrains, setShowPrimaryDrains] = useState(false)
  const [showSecondaryDrains, setShowSecondaryDrains] = useState(false)
  const [showWards, setShowWards] = useState(false)

  const [selectedCell, setSelectedCell] = useState(null)
  const [wardDict, setWardDict] = useState({})
  const [wardsGeo, setWardsGeo] = useState(null)
  const [focusedBounds, setFocusedBounds] = useState(null)
  const [focusedWardId, setFocusedWardId] = useState(null)

  const [showRescue, setShowRescue] = useState(false)
  const [rescuePlan, setRescuePlan] = useState(null)
  const [rescueLoading, setRescueLoading] = useState(false)
  const [availableTeams, setAvailableTeams] = useState(5)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetch(`${apiUrl}/api/geojson/blr_wards.geojson`)
      .then(res => res.json())
      .then(data => {
        const dict = {};
        data.features.forEach((f, i) => {
          // Default rasterization uses 1-based indexing for features
          dict[i + 1] = f.properties.ward_name || f.properties.Name || f.properties.KGISWardNa || `Unknown ${i + 1}`;
        });
        setWardDict(dict);
        setWardsGeo(data);
      })
      .catch(e => console.warn("Could not load wards dict"));

    fetch(`${apiUrl}/api/terrain`)
      .then(res => res.json())
      .then(data => setTerrain(data))
      .catch(err => console.error("Could not load base terrain", err));

    fetch(`${apiUrl}/api/data-status`)
      .then(res => res.json())
      .then(data => setDataStatus(data))
      .catch(err => console.error("Could not load backend data constraints", err));
  }, [apiUrl])

  const runSimulation = useCallback(async () => {
    setSimLoading(true)
    setError(null)
    setIsPlaying(false)
    try {
      const payload = {
        width: 50,
        height: 50,
        rainfall_intensity_mm_hr: simParams.rainfallMode === 'api_forecast' ? -1.0 : Number(simParams.rainfall),
        duration_minutes: Number(simParams.duration),
        dt_minutes: Number(simParams.dt),
        scenario: simParams.scenario,
        seed: simParams.seed
      }

      const response = await fetch(`${apiUrl}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Simulation failed or unstable inputs (Max Grid 200, try shorter dt).')
      }

      const data = await response.json()
      setSimulation(data)
      setCurrentFrame(0)
      setIsPlaying(true)

      // Auto-fetch rescue plan if tab is open
      if (showRescue) {
        fetchRescuePlan(data, availableTeams);
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSimLoading(false)
    }
  }, [apiUrl, simParams, showRescue, availableTeams])

  const fetchRescuePlan = async (simData, teams) => {
    setRescueLoading(true);
    try {
      const payload = {
        available_teams: Number(teams),
        rainfall_intensity_mm_hr: simParams.rainfallMode === 'api_forecast' ? -1.0 : Number(simParams.rainfall),
        duration_minutes: Number(simParams.duration),
        dt_minutes: Number(simParams.dt)
      };

      const res = await fetch(`${apiUrl}/api/rescue/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Rescue formulation failed");
      const data = await res.json();
      setRescuePlan(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRescueLoading(false);
    }
  };

  const handleToggleRescue = () => {
    const next = !showRescue;
    setShowRescue(next);
    if (next && simulation) {
      fetchRescuePlan(simulation, availableTeams);
    }
  };

  const getCellStats = () => {
    if (!selectedCell || !terrain) return null;
    const { row, col, currentDepth, peakDepth } = selectedCell;
    let z = selectedCell.elevation;
    let isLake = false;
    let runoff = 0;

    if (terrain.lake_mask && terrain.lake_mask[row]) {
      isLake = terrain.lake_mask[row][col];
    }
    if (terrain.runoff_coefficient && terrain.runoff_coefficient[row]) {
      runoff = terrain.runoff_coefficient[row][col];
    }

    // Merge computed depths from backend + map engine natively
    return { ...selectedCell, z, isLake, runoff, depth: parseFloat(currentDepth) };
  }

  const cellStats = getCellStats();

  // Precompute a synthetic "peak frame" for the Peak Extent view mode
  const peakFrame = useMemo(() => {
    if (!simulation?.frames?.length) return null;
    const height = simulation.frames[0].depth.length;
    const width = simulation.frames[0].depth[0].length;

    // Initialize empty matrices
    const maxDepth = Array.from({ length: height }, () => new Float32Array(width));
    const maxRisk = Array.from({ length: height }, () => new Int32Array(width));

    let maxOverallDepth = 0;

    // Scan all frames and track historical maximums
    for (let f = 0; f < simulation.frames.length; f++) {
      const frame = simulation.frames[f];
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          if (frame.depth[r][c] > maxDepth[r][c]) {
            maxDepth[r][c] = frame.depth[r][c];
          }
          if (frame.risk[r][c] > maxRisk[r][c]) {
            maxRisk[r][c] = frame.risk[r][c];
          }
        }
      }
    }

    // Convert Float32Array back to regular arrays for RiskOverlay component
    const formattedDepth = maxDepth.map(row => Array.from(row));
    const formattedRisk = maxRisk.map(row => Array.from(row));

    return {
      time_minutes: simulation.summary.time_to_first_critical_minutes || 0,
      depth: formattedDepth,
      risk: formattedRisk,
      // No realistic peak flow vector can be aggregated visually
      flow: { vx: Array.from({ length: height }, () => Array(width).fill(0)), vy: Array.from({ length: height }, () => Array(width).fill(0)) }
    };
  }, [simulation]);

  const handleWardClick = (wardId) => {
    if (focusedWardId === wardId) {
      setFocusedWardId(null);
      setFocusedBounds(null);
      return;
    }

    if (!wardsGeo) return;
    const feature = wardsGeo.features[wardId - 1]; // 1-based indexing map
    if (!feature) return;

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

    // Recursive coords parser for MultiPolygon / Polygon
    const processCoords = (coords) => {
      if (typeof coords[0] === 'number') {
        const [lng, lat] = coords;
        minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
      } else {
        coords.forEach(processCoords);
      }
    };

    processCoords(feature.geometry.coordinates);
    setFocusedBounds([[minLat, minLng], [maxLat, maxLng]]);
    setFocusedWardId(wardId);
    setShowWards(true);
  }

  return (
    <div className="min-h-screen max-h-screen bg-slate-950 flex flex-col font-sans overflow-hidden text-slate-200">
      {/* TOP: Header */}
      <header className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800 py-3 px-6 flex justify-between items-center z-10 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Droplets className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">FlowShield</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Flood Simulation Dashboard</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {simulation && (
            <div className="hidden md:flex items-center text-sm font-semibold bg-indigo-900/30 px-3 py-1 rounded-full text-indigo-300 border border-indigo-700/50 shadow-inner">
              <Activity className="w-4 h-4 mr-2 text-indigo-400" />
              Simulation Ready ({simulation.metadata.duration_minutes}m timeframe)
            </div>
          )}
        </div>
      </header>

      {/* MAIN DASHBOARD */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">

        {/* LEFT: Controls (Memoized entirely preventing timeline scrubbing lag) */}
        {useMemo(() => (
          <aside className="w-full md:w-72 lg:w-80 bg-slate-900/80 backdrop-blur-md border-r border-slate-800 shadow-xl overflow-y-auto flex-shrink-0 flex flex-col z-10">

            {dataStatus && (
              <div className="px-5 pt-5 pb-2 border-b border-slate-800/50">
                <h3 className="text-xs font-bold flex items-center uppercase tracking-wider text-slate-500 mb-3">
                  Pipeline Engine Status
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(dataStatus).filter(([k]) => k !== 'city').map(([key, val]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-slate-400 capitalize">{key}</span>
                      <span className={`font-semibold ${val === 'real' ? 'text-emerald-400' : val.includes('api') ? 'text-teal-400' : 'text-rose-400'}`}>
                        {val.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-5 flex-1">
              <h3 className="text-md font-bold flex items-center mb-5 uppercase tracking-wide text-slate-300">
                <Settings2 className="w-5 h-5 mr-2 text-slate-500" /> Scenario Parameters
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-slate-300 flex justify-between mb-2">
                    Rainfall <span className="text-cyan-400 bg-cyan-950/50 border border-cyan-800/50 px-2 py-0.5 rounded text-xs">{simParams.rainfall} mm/hr</span>
                  </label>
                  {simParams.rainfallMode === 'api_forecast' ? (
                    <div className="w-full text-xs text-indigo-300 font-semibold italic bg-indigo-950/40 p-2 rounded border border-indigo-900/50">Fetching Open-Meteo Dynamic Arrays...</div>
                  ) : (
                    <input type="range" min="0" max="250" value={simParams.rainfall} onChange={e => setSimParams({ ...simParams, rainfall: Number(e.target.value) })} className="w-full accent-cyan-500" />
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300 flex justify-between mb-2">
                    Duration <span className="text-indigo-400 bg-indigo-950/50 border border-indigo-800/50 px-2 py-0.5 rounded text-xs">{simParams.duration} mins</span>
                  </label>
                  <input type="range" min="30" max="360" step="30" value={simParams.duration} onChange={e => setSimParams({ ...simParams, duration: Number(e.target.value) })} className="w-full accent-indigo-500" />
                </div>

                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <label className="text-xs font-bold text-slate-400 block mb-2 uppercase">Rainfall Constraints</label>
                  <select value={simParams.rainfallMode} onChange={e => setSimParams({ ...simParams, rainfallMode: e.target.value })} className="w-full bg-slate-900 border-slate-700 border p-2 rounded text-sm text-slate-200 font-medium focus:ring focus:ring-cyan-900 outline-none transition mb-3">
                    <option value="constant">Manual Engine Slider</option>
                    <option value="api_forecast">Open-Meteo Live Forecast</option>
                  </select>

                  <label className="text-xs font-bold text-slate-400 block mb-2 uppercase">Infrastructure Mode</label>
                  <select value={simParams.scenario} onChange={e => setSimParams({ ...simParams, scenario: e.target.value })} className="w-full bg-slate-900 border-slate-700 border p-2 rounded text-sm text-slate-200 font-medium focus:ring focus:ring-cyan-900 outline-none transition">
                    <option value="normal">Normal Operation</option>
                    <option value="blocked">100% Blocked Drains</option>
                  </select>
                </div>

                {error && <div className="text-xs text-red-400 font-medium bg-red-950/30 border border-red-900/50 p-3 rounded-lg shadow-sm">{error}</div>}

                <button onClick={runSimulation} disabled={simLoading} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-lg shadow-cyan-900/20 text-white font-bold rounded-lg transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:active:scale-100 border border-cyan-500/30">
                  {simLoading ? <span className="animate-pulse flex items-center"><Activity className="w-4 h-4 mr-2 animate-spin" /> Computing...</span> : <><CloudRain className="w-5 h-5 mr-2" /> Start Process</>}
                </button>
              </div>
            </div>
          </aside>
        ), [simParams, setSimParams, runSimulation, simLoading, dataStatus, availableTeams])}

        {/* CENTER: Maps & Sliders */}
        <section className="flex-1 flex flex-col relative bg-slate-950">

          <div className="absolute top-4 left-4 right-4 z-[400] pointer-events-none flex justify-between">
            <div className="bg-slate-900/80 backdrop-blur pointer-events-auto rounded-lg shadow-lg shadow-black/50 border border-slate-800/80 p-2 flex space-x-2">
              <button onClick={() => setShowRisk(false)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${!showRisk ? 'bg-cyan-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Depth Map</button>
              <button onClick={() => setShowRisk(true)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${showRisk ? 'bg-red-600/90 text-white shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Risk Zones</button>

              <div className="w-px h-6 bg-slate-700 self-center mx-2"></div>

              <button onClick={() => setShowVectors(!showVectors)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors border ${showVectors ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700 shadow-inner' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Flow Vectors</button>
            </div>

            <div className="bg-slate-900/80 backdrop-blur pointer-events-auto rounded-lg shadow-lg shadow-black/50 border border-slate-800/80 p-2 flex space-x-2">
              <button onClick={() => setShowPrimaryDrains(!showPrimaryDrains)} className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded-md transition-colors border ${showPrimaryDrains ? 'bg-cyan-900/50 text-cyan-300 border-cyan-700 shadow-inner' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Primary SWD</button>
              <button onClick={() => setShowSecondaryDrains(!showSecondaryDrains)} className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded-md transition-colors border ${showSecondaryDrains ? 'bg-teal-900/50 text-teal-300 border-teal-700 shadow-inner' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Secondary SWD</button>
              <div className="w-px h-6 bg-slate-700 self-center mx-2"></div>
              <button onClick={() => setShowWards(!showWards)} className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded-md transition-colors border ${showWards ? 'bg-amber-900/50 text-amber-300 border-amber-700 shadow-inner' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Ward Limits</button>
              <div className="w-px h-6 bg-slate-700 self-center mx-2"></div>
              <button onClick={handleToggleRescue} className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded-md transition-colors border ${showRescue ? 'bg-blue-900/50 text-blue-300 border-blue-700 shadow-inner shadow-blue-500/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Rescue Teams</button>
            </div>
          </div>

          <div className="flex-1 relative z-0">
            <FloodMap
              cityData={terrain}
              currentFrame={showPeakView ? peakFrame : simulation?.frames[currentFrame]}
              simulationResult={simulation}
              activeLayers={{
                floodDepth: !showRisk,
                riskZones: showRisk,
                drainagePrimary: showPrimaryDrains,
                drainageSecondary: showSecondaryDrains,
                lakes: false,
                wards: showWards,
                flowArrows: showVectors
              }}
              focusedBounds={focusedBounds}
              focusedWardId={focusedWardId}
              onCellClick={(cellData) => setSelectedCell(cellData)}
              onWardClick={handleWardClick}
              rescuePlan={rescuePlan}
              showRescue={showRescue}
            />
          </div>

          <TimelineScrubber
            snapshots={simulation?.frames || []}
            currentStep={currentFrame}
            setCurrentStep={setCurrentFrame}
            showPeakView={showPeakView}
            setShowPeakView={setShowPeakView}
            stormDurationHours={simParams.duration / 60}
          />
        </section>

        {/* RIGHT: Early Warning Panel */}
        <aside className="w-full md:w-72 lg:w-80 bg-slate-900/80 backdrop-blur-md border-l border-slate-800 shadow-xl overflow-y-auto flex-shrink-0 flex flex-col z-10">

          {showRescue ? (
            <div className="flex flex-col h-full">
              <div className="p-5 border-b border-slate-800/50 bg-slate-950/30">
                <label className="text-sm font-semibold text-slate-300 flex justify-between mb-2">
                  Available Response Teams <span className="text-blue-400 bg-blue-950/50 border border-blue-800/50 px-2 py-0.5 rounded text-xs">{availableTeams} Teams</span>
                </label>
                <input
                  type="range" min="1" max="15" step="1"
                  value={availableTeams}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setAvailableTeams(v);
                    if (simulation) fetchRescuePlan(simulation, v);
                  }}
                  className="w-full accent-blue-500"
                />
              </div>
              <RescueDashboard rescuePlan={rescuePlan} loading={rescueLoading} />
            </div>
          ) : (
            <>
              {simulation && (
                <div className="p-5 border-b border-slate-800/50 bg-slate-950/30">
                  <h3 className="text-md font-bold flex items-center mb-4 uppercase tracking-wide text-slate-300">
                    <ShieldAlert className="w-5 h-5 mr-2 text-red-500" /> Disaster Summary
                  </h3>

                  {(() => {
                    const currentSnapshot = simulation.frames[currentFrame];
                    const liveMaxDepth = currentSnapshot?.max_depth_m || 0;
                    const liveCriticalCells = currentSnapshot?.critical_cells || 0;
                    const liveAffectedPopulation = currentSnapshot?.affected_population || 0;

                    const tDanger = simulation.summary.time_to_first_critical_minutes;
                    const currentMin = currentSnapshot?.time_minutes || 0;
                    let displayTDanger = '--';
                    if (tDanger !== null && tDanger !== undefined) {
                      const diff = Math.round(tDanger - currentMin);
                      if (diff <= 0) displayTDanger = '0m';
                      else displayTDanger = `${diff}m`;
                    }

                    return (
                      <div className="space-y-4">
                        <div className="bg-slate-800/50 p-3 rounded shadow-sm border border-slate-700/50 transition-colors">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Peak Map Depth (Live)</p>
                          <p className="text-2xl font-black text-cyan-400 leading-none">{liveMaxDepth.toFixed(2)}m</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-800/50 p-3 rounded shadow-sm border border-slate-700/50 transition-colors">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Critical Cells (Live)</p>
                            <p className="text-xl font-black text-red-500 leading-none">{liveCriticalCells}</p>
                          </div>
                          <div className={`bg-slate-800/50 p-3 rounded shadow-sm border border-slate-700/50 transition-colors ${displayTDanger === '0m' ? 'border-red-500/50 bg-red-950/30' : ''}`}>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Time to Danger</p>
                            <p className={`text-xl font-black leading-none ${displayTDanger === '0m' ? 'text-red-400 animate-pulse' : 'text-indigo-300'}`}>
                              {displayTDanger}
                            </p>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded shadow-sm border border-slate-700/50 col-span-2 flex items-center justify-between transition-colors">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Est. Affected Population (Live)</p>
                              <p className="text-xl font-black text-amber-500 leading-none">
                                {liveAffectedPopulation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </p>
                            </div>
                            <div className="text-right text-[9px] text-slate-500 italic max-w-[100px] leading-tight">
                              Based on warning-level flooding
                            </div>
                          </div>
                        </div>

                        {simulation.summary.critical_wards && Object.keys(simulation.summary.critical_wards).length > 0 && (
                          <div className="bg-red-950/30 p-3 rounded shadow-sm border border-red-900/50 mt-2">
                            <p className="text-[10px] text-red-400 font-bold uppercase mb-2">Most Critical Wards</p>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {Object.entries(simulation?.frames[currentFrame]?.critical_wards || {})
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 5) // Show top 5
                                .map(([wardId, cells]) => {
                                  const wName = wardDict[wardId] || `Area ${wardId}`;
                                  return (
                                    <div key={wardId} onClick={() => handleWardClick(wardId)} className="flex justify-between items-center bg-slate-800/30 p-2 rounded border border-slate-700/30 cursor-pointer hover:bg-slate-700/50 transition-colors">
                                      <span className="text-sm text-slate-300 font-medium tracking-wide w-3/4 truncate pr-2" title={wName}>{wName}</span>
                                      <span className="text-xs font-bold text-red-200 bg-red-950/40 border border-red-900 px-2 py-0.5 rounded">{cells} cells</span>
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="p-5 flex-1">
                <h3 className="text-md font-bold flex items-center mb-4 uppercase tracking-wide text-slate-300">
                  <Target className="w-5 h-5 mr-2 text-cyan-500" /> Inspector
                </h3>

                {!cellStats ? (
                  <div className="text-sm text-slate-500 text-center p-6 border-2 border-dashed border-slate-800 rounded-lg bg-slate-900/30">
                    Click any cell on the map to inspect granular physics parameters.
                  </div>
                ) : (
                  <div className="bg-slate-800/80 shadow border border-slate-700/50 rounded-lg overflow-hidden text-sm">
                    <div className="bg-slate-950/80 text-white p-3 px-4 font-bold flex justify-between border-b border-slate-700/50">
                      <span className="text-cyan-400">Cell [{cellStats.row}, {cellStats.col}]</span>
                      {cellStats.isLake && <span className="bg-indigo-900/80 text-indigo-300 border border-indigo-700 border-opacity-50 text-[10px] px-2 py-0.5 rounded-full uppercase shadow-sm">Lake Basin</span>}
                    </div>
                    <div className="divide-y divide-slate-700/50">
                      <div className="p-3 px-4 flex justify-between">
                        <span className="text-slate-400 font-semibold">Elevation</span>
                        <span className="font-mono text-slate-200">{cellStats.z.toFixed(2)}m</span>
                      </div>
                      <div className="p-3 px-4 flex justify-between">
                        <span className="text-slate-400 font-semibold">Runoff Coeff</span>
                        <span className="font-mono text-slate-200">{cellStats.runoff.toFixed(2)}</span>
                      </div>
                      <div className={`p-3 px-4 flex justify-between ${cellStats.depth > 0 ? 'bg-cyan-950/20' : ''}`}>
                        <span className="text-slate-400 font-semibold">Current Depth</span>
                        <span className="font-mono font-bold text-cyan-400">{cellStats.depth.toFixed(3)}m</span>
                      </div>
                      <div className="p-3 px-4 flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">Risk Status</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cellStats.risk === "CRITICAL"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : cellStats.risk === "WARNING"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}>
                          {cellStats.risk}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </main>
    </div >
  )
}

export default App
