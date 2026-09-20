/**
 * FlowShield - RiskOverlay Component
 * Renders the 100x100 flood depth or risk classification field onto a Leaflet Canvas overlay.
 */

import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { RISK_CONFIG, decodeDepthFrame } from "../../utils/mapUtils";

export function RiskOverlay({
  currentFrame,
  bbox,
  visible = true,
  mode = "depth", // "depth" or "risk"
  opacity = 0.75,
}) {
  const map = useMap();
  const imageOverlayRef = useRef(null);

  useEffect(() => {
    if (!visible || !bbox || !map) {
      if (imageOverlayRef.current) {
        map.removeLayer(imageOverlayRef.current);
        imageOverlayRef.current = null;
      }
      return;
    }

    const bounds = [
      [bbox.south, bbox.west],
      [bbox.north, bbox.east],
    ];

    // Create offscreen canvas for rendering 100x100 grid cells
    const width = 100;
    const height = 100;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    let isCancelled = false;

    async function renderFrame() {
      let depthArray = null;

      if (currentFrame?.depth && Array.isArray(currentFrame.depth[0])) {
        // Direct downsampled matrix preview
        const raw = currentFrame.depth;
        const rH = raw.length;
        const rW = raw[0].length;
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        for (let r = 0; r < height; r++) {
          const sampleR = Math.floor((r / height) * rH);
          for (let c = 0; c < width; c++) {
            const sampleC = Math.floor((c / width) * rW);
            const d = raw[sampleR][sampleC] || 0.0;
            const idx = (r * width + c) * 4;

            if (d < 0.02) {
              data[idx + 3] = 0; // transparent
            } else if (mode === "risk") {
              if (d < RISK_CONFIG.SAFE_THRESHOLD_M) {
                // Safe Green
                data[idx] = 16;
                data[idx + 1] = 185;
                data[idx + 2] = 129;
                data[idx + 3] = 140;
              } else if (d <= RISK_CONFIG.CRITICAL_THRESHOLD_M) {
                // Warning Amber
                data[idx] = 245;
                data[idx + 1] = 158;
                data[idx + 2] = 11;
                data[idx + 3] = 190;
              } else {
                // Critical Red
                data[idx] = 239;
                data[idx + 1] = 68;
                data[idx + 2] = 68;
                data[idx + 3] = 220;
              }
            } else {
              // Depth gradient
              if (d < 0.10) {
                data[idx] = 56;
                data[idx + 1] = 189;
                data[idx + 2] = 248; // Cyan
                data[idx + 3] = Math.min(180, Math.floor(60 + d * 1200));
              } else if (d <= 0.30) {
                data[idx] = 37;
                data[idx + 1] = 99;
                data[idx + 2] = 235; // Blue
                data[idx + 3] = Math.min(220, Math.floor(160 + (d - 0.1) * 300));
              } else {
                data[idx] = 225;
                data[idx + 1] = 29;
                data[idx + 2] = 72; // Crimson
                data[idx + 3] = Math.min(245, Math.floor(200 + (d - 0.3) * 150));
              }
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } else if (currentFrame?.depth && typeof currentFrame.depth === "string") {
        depthArray = await decodeDepthFrame(currentFrame.depth, width, height);
        if (isCancelled) return;

        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        for (let i = 0; i < depthArray.length; i++) {
          const d = depthArray[i];
          const idx = i * 4;
          const r = Math.floor(i / width);
          const c = i % width;
          const rH = currentFrame?.risk?.length || height;
          const rW = currentFrame?.risk?.[0]?.length || width;
          const sampleR = Math.floor((r / height) * rH);
          const sampleC = Math.floor((c / width) * rW);

          if (d < 0.05) {
            data[idx + 3] = 0;
          } else if (mode === "risk") {
            const riskValue = currentFrame?.risk ? currentFrame.risk[sampleR][sampleC] : (d < RISK_CONFIG.SAFE_THRESHOLD_M ? 0 : d <= RISK_CONFIG.CRITICAL_THRESHOLD_M ? 1 : 2);
            if (riskValue === 0) {
              data[idx + 3] = 0; // Transparent for Safe limits avoiding full screen clutter
            } else if (riskValue === 1) {
              data[idx] = 245;
              data[idx + 1] = 158;
              data[idx + 2] = 11;
              data[idx + 3] = 180;
            } else {
              data[idx] = 220;
              data[idx + 1] = 38;
              data[idx + 2] = 38;
              data[idx + 3] = 220;
            }
          } else {
            if (d < 0.10) {
              data[idx] = 56;
              data[idx + 1] = 189;
              data[idx + 2] = 248;
              data[idx + 3] = Math.min(180, Math.floor(60 + d * 1200));
            } else if (d <= 0.30) {
              data[idx] = 37;
              data[idx + 1] = 99;
              data[idx + 2] = 235;
              data[idx + 3] = Math.min(220, Math.floor(160 + (d - 0.1) * 300));
            } else {
              data[idx] = 225;
              data[idx + 1] = 29;
              data[idx + 2] = 72;
              data[idx + 3] = Math.min(245, Math.floor(200 + (d - 0.3) * 150));
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const dataUrl = canvas.toDataURL();
      if (imageOverlayRef.current) {
        imageOverlayRef.current.setUrl(dataUrl);
        imageOverlayRef.current.setOpacity(opacity);
        imageOverlayRef.current.setBounds(bounds);
      } else {
        imageOverlayRef.current = L.imageOverlay(dataUrl, bounds, {
          opacity,
          interactive: false,
        }).addTo(map);
      }
    }

    renderFrame();

    return () => {
      isCancelled = true;
    };
  }, [currentFrame, bbox, visible, mode, opacity, map]);

  return null;
}
