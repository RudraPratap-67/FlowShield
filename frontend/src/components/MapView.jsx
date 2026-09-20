import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Rectangle,
  CircleMarker,
  Polyline,
  Polygon,
  Popup,
  Tooltip,
  ImageOverlay,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Layers, AlertTriangle, CheckCircle, ShieldAlert, Droplets } from 'lucide-react';

// Valley bounding box
const BBOX = {
  south: 12.89,
  north: 12.98,
  west: 77.62,
  east: 77.72,
};

const MAP_BOUNDS = [
  [BBOX.south, BBOX.west],
  [BBOX.north, BBOX.east],
];

// Major Rajakaluve channel polylines for visualization
const DRAINAGE_CHANNELS = [
  // K-100 Primary Rajakaluve: Koramangala -> Ejipura -> ST Bed -> Bellandur Inlet
  [
    [12.934, 77.625],
    [12.9345, 77.632],
    [12.935, 77.640],
    [12.936, 77.652],
    [12.937, 77.665],
  ],
  // Agara to Bellandur canal
  [
    [12.922, 77.636],
    [12.925, 77.645],
    [12.930, 77.655],
    [12.935, 77.666],
  ],
  // Bellandur spillway to Varthur canal
  [
    [12.943, 77.681],
    [12.945, 77.692],
    [12.946, 77.702],
    [12.946, 77.710],
  ],
  // Varthur outflow canal
  [
    [12.952, 77.715],
    [12.954, 77.718],
    [12.955, 77.720],
  ],
  // EcoSpace / ORR roadside drainage trunk
  [
    [12.920, 77.680],
    [12.926, 77.684],
    [12.932, 77.687],
    [12.938, 77.688],
  ],
];

// Approximate lake polygons in the valley
const LAKE_POLYGONS = [
  // Bellandur Lake
  {
    name: 'Bellandur Lake (361 ha)',
    coords: [
      [12.932, 77.660],
      [12.938, 77.662],
      [12.944, 77.675],
      [12.943, 77.683],
      [12.936, 77.682],
      [12.931, 77.671],
    ],
  },
  // Varthur Lake
  {
    name: 'Varthur Lake (180 ha)',
    coords: [
      [12.942, 77.705],
      [12.949, 77.708],
      [12.954, 77.717],
      [12.948, 77.719],
      [12.942, 77.714],
    ],
  },
  // Agara Lake
  {
    name: 'Agara Lake (58 ha)',
    coords: [
      [12.919, 77.632],
      [12.924, 77.633],
      [12.925, 77.640],
      [12.920, 77.640],
    ],
  },
  // Kaikondrahalli Lake
  {
    name: 'Kaikondrahalli Lake (25 ha)',
    coords: [
      [12.908, 77.680],
      [12.912, 77.681],
      [12.913, 77.686],
      [12.909, 77.685],
    ],
  },
];

// Helper to render water depth matrix directly to data URL for high performance Leaflet ImageOverlay
function generateWaterDepthOverlay(depthMatrix) {
  if (!depthMatrix || depthMatrix.length === 0) return null;

  const rows = depthMatrix.length;
  const cols = depthMatrix[0].length;

  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(cols, rows);
  const data = imgData.data;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = depthMatrix[r][c];
      const idx = (r * cols + c) * 4;

      if (d < 0.05) {
        // Transparent
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      } else if (d < 0.20) {
        // Ankle deep (0.05 - 0.20m): Light cyan
        data[idx] = 34;      // R
        data[idx + 1] = 211;  // G
        data[idx + 2] = 238;  // B
        data[idx + 3] = 140;  // Alpha
      } else if (d < 0.40) {
        // Knee deep (0.20 - 0.40m): Deep ocean blue
        data[idx] = 14;
        data[idx + 1] = 165;
        data[idx + 2] = 233;
        data[idx + 3] = 190;
      } else if (d < 0.70) {
        // Waist deep (0.40 - 0.70m): Hazardous amber/orange
        data[idx] = 249;
        data[idx + 1] = 115;
        data[idx + 2] = 22;
        data[idx + 3] = 220;
      } else {
        // Critical (> 0.70m): Severe purple/red
        data[idx] = 225;
        data[idx + 1] = 29;
        data[idx + 2] = 72;
        data[idx + 3] = 240;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL();
}

export default function MapView({
  gridData,
  currentSnapshot,
  peakDepthMatrix,
  showPeakView,
  blockedDrains,
  onToggleBlockDrain,
  selectedHotspot,
  onSelectHotspot,
}) {
  const [showDrains, setShowDrains] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showLakes, setShowLakes] = useState(true);
  const [showWaterDepth, setShowWaterDepth] = useState(true);

  // Active depth matrix to render
  const activeMatrix = showPeakView
    ? peakDepthMatrix
    : currentSnapshot?.depth_matrix;

  // Generate ImageOverlay data URL whenever matrix updates
  const overlayUrl = useMemo(() => {
    if (!showWaterDepth || !activeMatrix) return null;
    return generateWaterDepthOverlay(activeMatrix);
  }, [activeMatrix, showWaterDepth]);

  // Blocked drains lookup set
  const blockedSet = useMemo(() => {
    const set = new Set();
    if (blockedDrains) {
      blockedDrains.forEach(([r, c]) => set.add(`${r}_${c}`));
    }
    return set;
  }, [blockedDrains]);

  // Hotspots live statuses lookup from current snapshot
  const hotspotStatusLookup = useMemo(() => {
    const map = {};
    if (currentSnapshot?.hotspots) {
      currentSnapshot.hotspots.forEach((h) => {
        map[h.id] = h;
      });
    }
    return map;
  }, [currentSnapshot]);

  return (
    <div className="relative w-full h-full min-h-[540px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      <MapContainer
        bounds={MAP_BOUNDS}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* Dark Matter Carto Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=eyJhbGciOiJIUzI1NiJ9.eyJhIjoiYWNfNDMwYjMzNnMiLCJqdGkiOiIxYzJhZDc3NiJ9.xHTisXjpzGIXMK_ZszsnaEUVfV5dWBLiqqPM5md7g_4"
          maxZoom={19}
        />

        {/* Catchment Bounding Box Outline */}
        <Rectangle
          bounds={MAP_BOUNDS}
          pathOptions={{
            color: '#06b6d4',
            weight: 1.5,
            dashArray: '4, 6',
            fillColor: 'transparent',
          }}
        />

        {/* Lakes and Natural Retention Bodies */}
        {showLakes &&
          LAKE_POLYGONS.map((lake, idx) => (
            <Polygon
              key={`lake-${idx}`}
              positions={lake.coords}
              pathOptions={{
                color: '#38bdf8',
                weight: 1.5,
                fillColor: '#0284c7',
                fillOpacity: 0.25,
              }}
            >
              <Tooltip sticky>{lake.name}</Tooltip>
            </Polygon>
          ))}

        {/* Stormwater Drainage Lines (Rajakaluves) */}
        {showDrains &&
          DRAINAGE_CHANNELS.map((line, idx) => (
            <Polyline
              key={`drain-line-${idx}`}
              positions={line}
              pathOptions={{
                color: '#38bdf8',
                weight: 3.5,
                opacity: 0.7,
                dashArray: '2, 6',
              }}
            />
          ))}

        {/* Dynamic Water Depth Simulation Overlay */}
        {overlayUrl && (
          <ImageOverlay
            url={overlayUrl}
            bounds={MAP_BOUNDS}
            opacity={0.85}
            interactive={false}
          />
        )}

        {/* Interactive Blockable Culverts / Drain Nodes */}
        {showDrains &&
          gridData?.blockable_drains?.map((drain) => {
            const isBlocked = blockedSet.has(`${drain.grid_row}_${drain.grid_col}`);
            return (
              <CircleMarker
                key={drain.id}
                center={[drain.lat, drain.lon]}
                radius={isBlocked ? 8 : 5}
                eventHandlers={{
                  click: () => onToggleBlockDrain(drain.grid_row, drain.grid_col),
                }}
                pathOptions={{
                  color: isBlocked ? '#f43f5e' : '#10b981',
                  fillColor: isBlocked ? '#e11d48' : '#059669',
                  fillOpacity: isBlocked ? 0.95 : 0.7,
                  weight: isBlocked ? 2.5 : 1.5,
                }}
              >
                <Tooltip direction="top" offset={[0, -5]}>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 m-0">
                      Culvert ({drain.grid_row}, {drain.grid_col})
                    </p>
                    <p className="text-slate-600 m-0">
                      Status: {isBlocked ? '🔴 BLOCKED' : '🟢 CLEAR'}
                    </p>
                    <p className="text-[10px] text-blue-600 font-bold m-0 mt-0.5">
                      Click to {isBlocked ? 'Unblock' : 'Block'}
                    </p>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* Critical Infrastructure Hotspots */}
        {showHotspots &&
          gridData?.infrastructure_hotspots?.map((hp) => {
            const live = hotspotStatusLookup[hp.id] || {};
            const depth = live.depth_m ?? 0.0;
            const status = live.status ?? 'SAFE';
            const isSelected = selectedHotspot?.id === hp.id;

            let badgeColor = '#10b981'; // Green SAFE
            if (status === 'WATCH') badgeColor = '#38bdf8';
            else if (status === 'WARNING') badgeColor = '#f59e0b';
            else if (status === 'CRITICAL') badgeColor = '#ef4444';

            return (
              <CircleMarker
                key={hp.id}
                center={[hp.lat, hp.lon]}
                radius={isSelected ? 11 : 8}
                eventHandlers={{
                  click: () => onSelectHotspot(hp),
                }}
                pathOptions={{
                  color: isSelected ? '#ffffff' : badgeColor,
                  fillColor: badgeColor,
                  fillOpacity: 0.9,
                  weight: isSelected ? 3 : 2,
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[190px]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-1.5">
                      <h4 className="font-bold text-slate-900 text-sm m-0">{hp.name}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${status === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-700'
                            : status === 'WARNING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-2">{hp.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">Water Depth:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {depth.toFixed(2)} m
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Crit Threshold:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {hp.critical_depth_m} m
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Elevation:</span>
                        <span className="font-bold text-slate-700">
                          {hp.elevation_m} m ASL
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Type:</span>
                        <span className="font-bold text-slate-700 uppercase text-[10px]">
                          {hp.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>

      {/* Layer Toggles Floating Control */}
      <div className="absolute top-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-xl flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold border-b border-slate-700/60 pb-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Map Layers</span>
        </div>

        <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showWaterDepth}
            onChange={(e) => setShowWaterDepth(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-0"
          />
          <span>Water Depth Inundation</span>
        </label>

        <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDrains}
            onChange={(e) => setShowDrains(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-0"
          />
          <span>Drains & Culverts</span>
        </label>

        <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showHotspots}
            onChange={(e) => setShowHotspots(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-0"
          />
          <span>Critical Hotspots</span>
        </label>

        <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showLakes}
            onChange={(e) => setShowLakes(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-0"
          />
          <span>Lakes & Wetlands</span>
        </label>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-xl text-xs flex flex-col gap-1.5">
        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-cyan-400" />
          <span>Inundation Depth</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-2.5 rounded-xs bg-[#22d3ee] inline-block" />
          <span className="text-slate-400">&lt; 0.2m (Nuisance)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-2.5 rounded-xs bg-[#0ea5e9] inline-block" />
          <span className="text-slate-400">0.2 - 0.4m (Knee Deep)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-2.5 rounded-xs bg-[#f97316] inline-block" />
          <span className="text-slate-400">0.4 - 0.7m (Waist Deep)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-2.5 rounded-xs bg-[#e11d48] inline-block" />
          <span className="text-slate-400">&gt; 0.7m (Severe/Hazard)</span>
        </div>
        <div className="border-t border-slate-800 pt-1.5 mt-0.5 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span className="text-slate-400">Culvert Clear</span>
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block ml-1" />
          <span className="text-slate-400">Blocked</span>
        </div>
      </div>
    </div>
  );
}
