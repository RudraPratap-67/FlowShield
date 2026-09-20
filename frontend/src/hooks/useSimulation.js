/**
 * FlowShield - useSimulation Hook
 * Manages simulation parameters, API calls, culvert blockage state, and preset scenarios.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

export const SCENARIO_PRESETS = {
  NORMAL: {
    id: "normal",
    name: "Normal Rain",
    intensity_mm_hr: 30,
    duration_min: 120,
    description: "Standard seasonal rainfall (30 mm/hr for 2 hrs). Managed by primary drains.",
    icon: "CloudRain",
  },
  HEAVY: {
    id: "heavy",
    name: "Heavy Monsoon",
    intensity_mm_hr: 65,
    duration_min: 180,
    description: "Intense monsoon downpour (65 mm/hr for 3 hrs). Water accumulation in low-lying valley.",
    icon: "CloudLightning",
  },
  EXTREME: {
    id: "extreme",
    name: "Extreme Cloudburst",
    intensity_mm_hr: 100,
    duration_min: 180,
    description: "Severe urban cloudburst (100 mm/hr for 3 hrs). Significant overtopping risk.",
    icon: "AlertTriangle",
  },
  DRAINAGE_FAILURE: {
    id: "drainage_failure",
    name: "Culvert Failure",
    intensity_mm_hr: 65,
    duration_min: 180,
    description: "Heavy rain combined with choked culverts and clogged Rajakaluves along Outer Ring Road.",
    icon: "OctagonX",
  },
};

export function useSimulation() {
  const [cityData, setCityData] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState(null);

  // Simulation parameters
  const [scenario, setScenario] = useState("heavy");
  const [rainfallIntensity, setRainfallIntensity] = useState(65.0);
  const [rainfallDuration, setRainfallDuration] = useState(180.0);
  const [blockedDrains, setBlockedDrains] = useState([]); // [[row, col], ...]

  // Outputs
  const [simulationResult, setSimulationResult] = useState(null);
  const [mlPrediction, setMlPrediction] = useState(null);
  const [forecast, setForecast] = useState(null);

  // Check health and load city data on mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const health = await api.getHealth();
        if (health.status === "ok" && isMounted) {
          setBackendConnected(true);
        }
      } catch (err) {
        if (isMounted) {
          setBackendConnected(false);
          setError("Backend unavailable — start the FastAPI server.");
        }
      }

      try {
        const city = await api.getCity(1);
        if (isMounted) {
          setCityData(city);
        }
      } catch (err) {
        console.warn("Could not load city data:", err);
      }

      try {
        const fc = await api.getForecast(6);
        if (isMounted) {
          setForecast(fc);
        }
      } catch {
        // Optional forecast
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Toggle blocked drain cell
  const toggleBlockDrain = useCallback((row, col) => {
    setBlockedDrains((prev) => {
      const exists = prev.some(([r, c]) => r === row && c === col);
      if (exists) {
        return prev.filter(([r, c]) => !(r === row && c === col));
      } else {
        return [...prev, [row, col]];
      }
    });
  }, []);

  const clearBlockedDrains = useCallback(() => {
    setBlockedDrains([]);
  }, []);

  // Preset selector
  const applyPreset = useCallback(
    (presetKey) => {
      const p = SCENARIO_PRESETS[presetKey];
      if (!p) return;
      setScenario(p.id);
      setRainfallIntensity(p.intensity_mm_hr);
      setRainfallDuration(p.duration_min);

      if (p.id === "drainage_failure" && cityData?.blockable_culverts) {
        // Select 6 primary choke points
        const defaultBlocked = cityData.blockable_culverts.slice(0, 8).map((c) => [c.grid_row, c.grid_col]);
        setBlockedDrains(defaultBlocked);
      } else if (scenario === "drainage_failure") {
        setBlockedDrains([]);
      }
    },
    [cityData, scenario]
  );

  // Run physical 2D simulation
  const executeSimulation = useCallback(async () => {
    setIsSimulating(true);
    setError(null);
    try {
      const payload = {
        rainfall: {
          intensity_mm_hr: Number(rainfallIntensity),
          duration_min: Number(rainfallDuration),
        },
        initial_water_depth_m: 0.0,
        scenario,
        dt_seconds: 60.0,
        output_interval_seconds: 300.0,
        blocked_drainage: blockedDrains,
        drainage_multiplier: scenario === "drainage_failure" ? 0.4 : 1.0,
        random_seed: 42,
      };

      const result = await api.simulate(payload);
      setSimulationResult(result);
      setBackendConnected(true);

      // Auto-trigger fast ML prediction in parallel for comparison
      triggerMlPrediction();
    } catch (err) {
      console.error("Simulation failed:", err);
      setError("Simulation failed to execute. Check FastAPI server logs.");
    } finally {
      setIsSimulating(false);
    }
  }, [rainfallIntensity, rainfallDuration, scenario, blockedDrains]);

  // Run ML surrogate inference
  const triggerMlPrediction = useCallback(async () => {
    setIsPredicting(true);
    try {
      const pred = await api.predict({
        rainfall_intensity: Number(rainfallIntensity),
        rainfall_duration: Number(rainfallDuration),
        blocked_drainage_fraction: blockedDrains.length / 350.0,
        blocked_drains: blockedDrains,
      });
      setMlPrediction(pred);
    } catch (err) {
      console.warn("ML prediction failed:", err);
    } finally {
      setIsPredicting(false);
    }
  }, [rainfallIntensity, rainfallDuration, blockedDrains]);

  return {
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
    triggerMlPrediction,
    simulationResult,
    mlPrediction,
    forecast,
  };
}
