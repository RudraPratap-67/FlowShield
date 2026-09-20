/**
 * FlowShield - FlowArrows Component
 * Renders hydrodynamic velocity vectors on a Leaflet map using Canvas.
 */

import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export function FlowArrows({ bbox, currentFrame, visible }) {
    const map = useMap();
    const canvasOverlayRef = useRef(null);

    useEffect(() => {
        if (!visible || !bbox || !map) {
            if (canvasOverlayRef.current) {
                map.removeLayer(canvasOverlayRef.current);
                canvasOverlayRef.current = null;
            }
            return;
        }

        const bounds = [
            [bbox.south, bbox.west],
            [bbox.north, bbox.east],
        ];

        // Read velocities. Either decoding or direct matrix
        let vx = null;
        let vy = null;

        if (currentFrame?.flow?.vx && currentFrame?.flow?.vy) {
            vx = currentFrame.flow.vx;
            vy = currentFrame.flow.vy;
        }

        if (!vx || !vy) {
            return; // Ensure no crashes if vector data missing
        }

        const rH = vx.length;
        const rW = vx[0].length;

        // Use a standard canvas mapping onto map bounds
        const width = 800; // Resolution of vector field
        const height = 800;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        // Grid spacing for drawing arrows
        const stepX = 25;
        const stepY = 25;

        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 2.5; // Thicker lines for visibility

        for (let y = 0; y < height; y += stepY) {
            const sampleY = Math.min(rH - 1, Math.floor((y / height) * rH));
            for (let x = 0; x < width; x += stepX) {
                const sampleX = Math.min(rW - 1, Math.floor((x / width) * rW));

                const ux = vx[sampleY][sampleX] || 0.0;
                const uy = vy[sampleY][sampleX] || 0.0;

                const magnitude = Math.sqrt(ux * ux + uy * uy);

                if (magnitude > 0.005) {
                    // Make arrows distinctly long
                    const arrowLen = Math.min(35, 12 + magnitude * 15);
                    const angle = Math.atan2(uy, ux);

                    const endX = x + Math.cos(angle) * arrowLen;
                    const endY = y + Math.sin(angle) * arrowLen;

                    // Color coded velocities
                    ctx.strokeStyle = magnitude > 1.0 ? "#f43f5e" : magnitude > 0.3 ? "#3b82f6" : "#0ea5e9";
                    ctx.fillStyle = ctx.strokeStyle;

                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();

                    // Form a large, unmistakable triangular arrowhead
                    const wingLen = Math.min(12, Math.max(8, arrowLen * 0.4));

                    ctx.beginPath();
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(endX - wingLen * Math.cos(angle - Math.PI / 6), endY - wingLen * Math.sin(angle - Math.PI / 6));
                    ctx.lineTo(endX - wingLen * Math.cos(angle + Math.PI / 6), endY - wingLen * Math.sin(angle + Math.PI / 6));
                    ctx.closePath();
                    ctx.fill();
                } else if (magnitude > 0.0001) {
                    // Static / very slow fluid dot
                    ctx.fillStyle = "rgba(14, 165, 233, 0.4)";
                    ctx.beginPath();
                    ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }

        const dataUrl = canvas.toDataURL();
        if (canvasOverlayRef.current) {
            canvasOverlayRef.current.setUrl(dataUrl);
            canvasOverlayRef.current.setBounds(bounds);
        } else {
            canvasOverlayRef.current = L.imageOverlay(dataUrl, bounds, {
                opacity: 0.8,
                interactive: false,
            }).addTo(map);
        }

        return () => {
            // cleanup handled in effect top
        };
    }, [bbox, currentFrame, visible, map]);

    return null;
}
