import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { divIcon } from "leaflet";

/**
 * Renders spatial clusters, deployment markers, and connection routes.
 */
export function RescueOverlay({ rescuePlan, visible }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Clear previous layers
        map.eachLayer((layer) => {
            if (layer.options?.attribution === "rescue_overlay") {
                map.removeLayer(layer);
            }
        });

        if (!visible || !rescuePlan) return;

        const drawZone = (zone, isAssigned) => {
            const centroid = [zone.centroid_lat, zone.centroid_lon];
            const deployment = [zone.recommended_deployment_lat, zone.recommended_deployment_lon];

            // Draw the logical zone centroid
            L.circleMarker(centroid, {
                radius: 8,
                color: isAssigned ? '#3b82f6' : '#ef4444',
                weight: 2,
                fillColor: isAssigned ? '#1e3a8a' : '#7f1d1d',
                fillOpacity: 0.6,
                attribution: "rescue_overlay"
            }).addTo(map);

            // Draw travel line bridging Deployment <-> Centroid
            L.polyline([deployment, centroid], {
                color: isAssigned ? '#3b82f6' : '#ef4444',
                dashArray: '4, 6',
                weight: 2,
                opacity: 0.8,
                attribution: "rescue_overlay"
            }).addTo(map);
        };

        // Plot Assigned Teams
        rescuePlan.assignments.forEach((assignment) => {
            const { deployment_lat, deployment_lon, zone_id, team_id, priority_score, reason } = assignment;

            const customIcon = divIcon({
                className: 'bg-transparent',
                html: `
          <div class="relative w-8 h-8 flex items-center justify-center -ml-4 -mt-4 shadow-lg group">
            <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
            <div class="w-6 h-6 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center z-10 
              shadow-[0_0_10px_rgba(37,99,235,0.8)] cursor-pointer">
              <span class="text-[9px] font-bold text-white">${team_id.replace('T-', '')}</span>
            </div>
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-slate-900 
              border border-blue-500/50 p-2 rounded shadow-2xl z-50 text-[10px] text-slate-300">
              <p class="font-bold text-white mb-1">Rescue Team ${team_id}</p>
              <p class="text-blue-300">Assigned to: ${zone_id}</p>
              <p class="mt-1 leading-tight text-slate-400 font-sans">${reason}</p>
            </div>
          </div>
        `
            });

            L.marker([deployment_lat, deployment_lon], {
                icon: customIcon,
                attribution: "rescue_overlay"
            }).addTo(map);
        });

        // Uncovered Zones
        rescuePlan.uncovered_zones.forEach(zone => {
            drawZone(zone, false);

            const badIcon = divIcon({
                className: 'bg-transparent text-center',
                html: `
          <div class="mt-2 ml-2 -translate-x-1/2">
            <span class="bg-red-950/80 text-red-400 border border-red-900/50 text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
              No resources
            </span>
          </div>
        `
            });
            L.marker([zone.centroid_lat, zone.centroid_lon], { icon: badIcon, attribution: "rescue_overlay" }).addTo(map);
        });

    }, [map, visible, rescuePlan]);

    return null;
}
