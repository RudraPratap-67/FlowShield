/**
 * FlowShield - FloodMap Component
 * Primary interactive Leaflet map featuring terrain, lakes, drainage, flow vectors, and cell inspector.
 */

import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Rectangle,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { DrainageOverlay } from "./DrainageOverlay";
import { FlowArrows } from "./FlowArrows";
import { RiskOverlay } from "./RiskOverlay";
import { RescueOverlay } from "./RescueOverlay";
import { coordToGrid, getRiskClass } from "../../utils/mapUtils";
import { Info, X, Layers } from "lucide-react";

// Interactive Map Click Inspector
function MapClickHandler({ bbox, width, height, onCellClick }) {
  useMapEvents({
    click(e) {
      if (!bbox) return;
      const { lat, lng } = e.latlng;
      if (
        lat >= bbox.south &&
        lat <= bbox.north &&
        lng >= bbox.west &&
        lng <= bbox.east
      ) {
        const [row, col] = coordToGrid(lat, lng, bbox, width, height);
        onCellClick({ lat, lng, row, col });
      }
    },
  });
  return null;
}

// Auto-resizes the map elegantly when bounds update or user clicks a specific geographical region
function MapResizer({ bounds, focusedBounds }) {
  const map = useMap();
  useEffect(() => {
    if (focusedBounds) {
      map.fitBounds(focusedBounds, { padding: [100, 100], maxZoom: 16, animate: true, duration: 1.2 });
    } else if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
    }
  }, [bounds, focusedBounds, map]);
  return null;
}

export function FloodMap({
  cityData,
  currentFrame,
  simulationResult,
  activeLayers,
  blockedDrains = [],
  onToggleBlockDrain,
  onCellClick,
  focusedBounds,
  focusedWardId,
  onWardClick,
  rescuePlan,
  showRescue,
}) {
  activeLayers = {
    floodDepth: true,
    riskZones: false,
    drainage: true,
    lakes: true,
    infrastructure: true,
    flowArrows: true,
    ...activeLayers,
  };

  const [selectedCell, setSelectedCell] = useState(null);

  const bbox = React.useMemo(() => cityData?.config ? {
    south: cityData.config.latitude_min,
    north: cityData.config.latitude_max,
    west: cityData.config.longitude_min,
    east: cityData.config.longitude_max,
  } : {
    south: 12.89,
    north: 12.98,
    west: 77.62,
    east: 77.72,
  }, [cityData?.config]);

  const center = React.useMemo(() => [
    (bbox.south + bbox.north) / 2,
    (bbox.west + bbox.east) / 2,
  ], [bbox.south, bbox.north, bbox.west, bbox.east]);

  const bounds = React.useMemo(() => [
    [bbox.south, bbox.west],
    [bbox.north, bbox.east],
  ], [bbox.south, bbox.north, bbox.west, bbox.east]);

  const handleCellClick = ({ lat, lng, row, col }) => {
    let currentDepth = 0.0;
    if (currentFrame?.depth && currentFrame.depth[row]) {
      currentDepth = currentFrame.depth[row][col] || 0.0;
    }

    const peakDepth = simulationResult?.summary?.max_depth_m
      ? Math.max(currentDepth, currentDepth * 1.35)
      : currentDepth;

    let elev = 890.0;
    if (cityData?.elevation && cityData.elevation[row]) {
      elev = cityData.elevation[row][col];
    }

    let drainCap = 20.0;
    if (cityData?.drainage_capacity && cityData.drainage_capacity[row]) {
      drainCap = cityData.drainage_capacity[row][col];
    }

    // Convert drainage back from m/hr matrix internal float to mm/hr for UI
    drainCap = drainCap * 1000.0;

    const isBlocked = blockedDrains.some(([r, c]) => r === row && c === col);
    let risk = "SAFE";
    if (currentFrame?.risk && currentFrame.risk[row]) {
      const rv = currentFrame.risk[row][col];
      risk = rv === 2 ? "CRITICAL" : rv === 1 ? "WARNING" : "SAFE";
    }

    const cellData = {
      lat: lat.toFixed(4),
      lng: lng.toFixed(4),
      row,
      col,
      elevation: elev,
      currentDepth: currentDepth.toFixed(2),
      peakDepth: peakDepth.toFixed(2),
      risk,
      drainageCapacity: drainCap,
      isBlocked,
      population: Math.round(85 + (1.0 - row / 100) * 120),
    };

    setSelectedCell(cellData);
    if (onCellClick) {
      onCellClick(cellData);
    }
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        {/* Premium Dark Matter Engine */}
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <MapResizer bounds={bounds} focusedBounds={focusedBounds} />

        {/* Map Layers (Dynamic Overlays are drawn on Canvas dynamically by the Physics Engine) */}

        {/* Hydrodynamic Flood Depth / Risk Overlay */}
        <RiskOverlay
          currentFrame={currentFrame}
          bbox={bbox}
          visible={activeLayers.floodDepth || activeLayers.riskZones}
          mode={activeLayers.riskZones ? "risk" : "depth"}
          opacity={0.8}
        />

        {/* Surface Flow Vectors */}
        <FlowArrows
          currentFrame={currentFrame}
          bbox={bbox}
          visible={activeLayers.flowArrows}
        />

        <DrainageOverlay
          drainageMatrix={cityData?.drainage_capacity}
          blockedDrainMask={null} // Extracted from scenario config or matrix if needed
          wardMask={cityData?.wards}
          bbox={bbox}
          showPrimary={activeLayers.drainagePrimary}
          showSecondary={activeLayers.drainageSecondary}
          showWards={activeLayers.wards}
          focusedWardId={focusedWardId}
          onWardClick={onWardClick}
        />

        <RescueOverlay
          rescuePlan={rescuePlan}
          visible={showRescue}
        />

        <MapClickHandler
          bbox={bbox}
          width={cityData?.config?.width || 100}
          height={cityData?.config?.height || 100}
          onCellClick={handleCellClick}
        />
      </MapContainer>

      {/* Floating Map Water Legend */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 shadow-xl text-xs font-sans max-w-[200px]">
        <div className="font-semibold text-slate-200 text-xs mb-1.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>{activeLayers.riskZones ? "Risk Zones" : "Flood Depth"}</span>
        </div>
        {activeLayers.riskZones ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/80 border border-emerald-400/30" />
              <span className="text-slate-300 text-[11px]">Safe (&lt; 0.10 m)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-amber-500/80 border border-amber-400/30" />
              <span className="text-slate-300 text-[11px]">Warning (0.10 - 0.30 m)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-red-500/80 border border-red-400/30" />
              <span className="text-slate-300 text-[11px]">Critical (&gt; 0.30 m)</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-cyan-400/70 border border-cyan-300/30" />
              <span className="text-slate-300 text-[11px]">Shallow (&lt; 0.10 m)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-blue-600/80 border border-blue-400/30" />
              <span className="text-slate-300 text-[11px]">Moderate (0.10 - 0.30 m)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-rose-600/90 border border-rose-400/30" />
              <span className="text-slate-300 text-[11px]">Deep (&gt; 0.30 m)</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Selected Cell Inspector Floating Card */}
      {selectedCell && (
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl w-72 text-xs font-sans animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-100">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Cell [{selectedCell.row}, {selectedCell.col}]</span>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Coordinates:</span>
              <span className="font-mono text-slate-200">
                {selectedCell.lat}°N, {selectedCell.lng}°E
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Elevation:</span>
              <span className="font-semibold text-slate-200">
                {selectedCell.elevation} m MSL
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Depth:</span>
              <span className="font-bold text-cyan-400">
                {selectedCell.currentDepth} m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Peak Depth:</span>
              <span className="font-bold text-amber-400">
                {selectedCell.peakDepth} m
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Risk Class:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedCell.risk === "CRITICAL"
                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                  : selectedCell.risk === "WARNING"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
              >
                {selectedCell.risk}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Drainage Capacity:</span>
              <span>{selectedCell.drainageCapacity} mm/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Est. Population:</span>
              <span>{selectedCell.population} residents</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
