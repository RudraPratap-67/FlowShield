/**
 * FlowShield - DrainageOverlay Component
 * Renders native SVG Geometries securely from the GeoJSON API avoiding matrix blurring seamlessly!
 */

import React, { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";

export function DrainageOverlay({
    showPrimary,
    showSecondary,
    showWards,
    focusedWardId,
    onWardClick,
}) {
    const [primaryGeo, setPrimaryGeo] = useState(null);
    const [secondaryGeo, setSecondaryGeo] = useState(null);
    const [wardsGeo, setWardsGeo] = useState(null);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    useEffect(() => {
        if (showPrimary && !primaryGeo) {
            fetch(`${apiUrl}/api/geojson/swd_primary.geojson`)
                .then(res => res.json())
                .then(data => setPrimaryGeo(data))
                .catch(err => console.error("Missing Primary SWD", err));
        }
    }, [showPrimary]);

    useEffect(() => {
        if (showSecondary && !secondaryGeo) {
            fetch(`${apiUrl}/api/geojson/swd_secondary.geojson`)
                .then(res => res.json())
                .then(data => setSecondaryGeo(data))
                .catch(err => console.error("Missing Secondary SWD", err));
        }
    }, [showSecondary]);

    useEffect(() => {
        if (showWards && !wardsGeo) {
            fetch(`${apiUrl}/api/geojson/blr_wards.geojson`)
                .then(res => res.json())
                .then(data => setWardsGeo(data))
                .catch(err => console.error("Missing Wards Geometry", err));
        }
    }, [showWards]);

    return (
        <>
            {showWards && wardsGeo && (
                <GeoJSON
                    key="wards-layer"
                    data={wardsGeo}
                    style={() => ({
                        color: "#c084fc", // Purple-400
                        weight: 1.5,
                        fillOpacity: 0.05,
                        dashArray: "4 4"
                    })}
                    onEachFeature={(feature, layer) => {
                        if (feature.properties) {
                            layer.bindTooltip(`Ward: ${feature.properties.ward_name || feature.properties.Name || "Unknown"}`, {
                                direction: 'center',
                                className: 'bg-slate-900 border-purple-500 text-purple-200 p-1 rounded font-sans text-xs opacity-90'
                            });
                        }
                        layer.on({
                            click: (e) => {
                                if (onWardClick) {
                                    const idx = wardsGeo.features.indexOf(feature);
                                    if (idx >= 0) {
                                        onWardClick(idx + 1);
                                    }
                                }
                            }
                        });
                    }}
                />
            )}

            {focusedWardId && wardsGeo && wardsGeo.features[focusedWardId - 1] && (
                <GeoJSON
                    key={`focused-ward-${focusedWardId}`}
                    data={wardsGeo.features[focusedWardId - 1]}
                    style={() => ({
                        color: "#06b6d4", // Cyan-500
                        weight: 4,
                        fillColor: "#06b6d4",
                        fillOpacity: 0.15,
                        dashArray: ""
                    })}
                />
            )}

            {showSecondary && secondaryGeo && (
                <GeoJSON
                    key="secondary-layer"
                    data={secondaryGeo}
                    style={() => ({
                        color: "#60a5fa", // Blue-400
                        weight: 2,
                        opacity: 0.85,
                        interactive: false
                    })}
                />
            )}

            {showPrimary && primaryGeo && (
                <GeoJSON
                    key="primary-layer"
                    data={primaryGeo}
                    style={() => ({
                        color: "#0ea5e9", // Sky-500
                        weight: 3.5,
                        opacity: 0.95,
                        interactive: false
                    })}
                />
            )}
        </>
    );
}
