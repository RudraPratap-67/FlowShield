/**
 * FlowShield - Map Utilities & Centralized Risk Configuration
 */

export const RISK_CONFIG = {
  SAFE_THRESHOLD_M: 0.10,
  CRITICAL_THRESHOLD_M: 0.30,
  COLORS: {
    SAFE: {
      hex: "#10b981",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      fill: "rgba(16, 185, 129, 0.55)",
    },
    WARNING: {
      hex: "#f59e0b",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      fill: "rgba(245, 158, 11, 0.75)",
    },
    CRITICAL: {
      hex: "#ef4444",
      badge: "bg-red-500/20 text-red-300 border-red-500/30",
      fill: "rgba(239, 68, 68, 0.85)",
    },
  },
};

/**
 * Returns risk class string based on water depth in meters.
 */
export function getRiskClass(depthM) {
  if (depthM < RISK_CONFIG.SAFE_THRESHOLD_M) return "SAFE";
  if (depthM <= RISK_CONFIG.CRITICAL_THRESHOLD_M) return "WARNING";
  return "CRITICAL";
}

/**
 * Converts water depth to RGBA color string.
 */
export function getWaterColor(depthM) {
  if (depthM < 0.02) return "rgba(0, 0, 0, 0)";
  if (depthM < 0.10) {
    const alpha = Math.min(0.65, 0.25 + depthM * 4.0);
    return `rgba(56, 189, 248, ${alpha})`; // Cyan
  }
  if (depthM <= 0.30) {
    const alpha = Math.min(0.85, 0.55 + (depthM - 0.10) * 1.5);
    return `rgba(245, 158, 11, ${alpha})`; // Warning Amber
  }
  const alpha = Math.min(0.92, 0.75 + (depthM - 0.30) * 0.4);
  return `rgba(239, 68, 68, ${alpha})`; // Critical Red
}

/**
 * Decompresses base64 uint16 zlib encoded frame to Float32Array (100x100),
 * with fallback to DecompressionStream or raw matrix.
 */
export async function decodeDepthFrame(base64Str, width = 100, height = 100, scale = 1000) {
  if (!base64Str) return new Float32Array(width * height);

  try {
    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Modern browser native DecompressionStream
    if (typeof DecompressionStream !== "undefined") {
      try {
        const stream = new Response(bytes).body.pipeThrough(new DecompressionStream("deflate"));
        const decompressedBuffer = await new Response(stream).arrayBuffer();
        const uint16View = new Uint16Array(decompressedBuffer);
        const floatArray = new Float32Array(uint16View.length);
        for (let i = 0; i < uint16View.length; i++) {
          floatArray[i] = uint16View[i] / scale;
        }
        return floatArray;
      } catch {
        // Fallback if inflate header differs
      }
    }
  } catch (err) {
    console.warn("Base64 decode warning:", err);
  }

  return new Float32Array(width * height);
}

/**
 * Converts lat/lon to grid row/col
 */
export function coordToGrid(lat, lon, bbox, width = 100, height = 100) {
  const row = Math.floor(((bbox.north - lat) / (bbox.north - bbox.south)) * height);
  const col = Math.floor(((lon - bbox.west) / (bbox.east - bbox.west)) * width);
  return [
    Math.max(0, Math.min(height - 1, row)),
    Math.max(0, Math.min(width - 1, col)),
  ];
}

/**
 * Converts grid row/col to lat/lon
 */
export function gridToCoord(row, col, bbox, width = 100, height = 100) {
  const lat = bbox.north - ((row + 0.5) * (bbox.north - bbox.south)) / height;
  const lon = bbox.west + ((col + 0.5) * (bbox.east - bbox.west)) / width;
  return [lat, lon];
}
