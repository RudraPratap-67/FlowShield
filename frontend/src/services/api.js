/**
 * FlowShield - API Client Service
 * Connects Frontend to FastAPI backend using VITE_API_URL or local default.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...options,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error ${res.status}: ${errText || res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`Request to ${endpoint} failed:`, err);
    throw err;
  }
}

export const api = {
  getHealth: () => request("/health"),
  getCity: (downsample = 1) => request(`/city?downsample=${downsample}`),
  simulate: (payload) =>
    request("/simulate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getForecast: (hours = 6) => request(`/forecast?hours=${hours}`),
  predict: (payload) =>
    request("/predict", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  compareScenarios: (payload) =>
    request("/scenario/compare", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  validate: () =>
    request("/validate", {
      method: "POST",
    }),
};
