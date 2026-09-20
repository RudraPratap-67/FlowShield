import numpy as np
from dataclasses import dataclass
from typing import Tuple, Dict, Any

from app.simulation.grid import TerrainGrid, GridConfig

@dataclass
class SimulationConfig:
    K_flow: float = 100.0  # tunable flow coefficient
    max_transfer_rate: float = 0.25  # Max proportion of water transferred out of a cell per step
    safe_threshold: float = 0.15
    warning_threshold: float = 0.30
    critical_threshold: float = 0.30

# Risk Enums
RISK_SAFE = 0
RISK_WARNING = 1
RISK_CRITICAL = 2

def calculate_mass_balance(
    initial_mass: float, 
    cumulative_rainfall: float, 
    cumulative_drainage: float, 
    cumulative_boundary_outflow: float, 
    final_mass: float
) -> Dict[str, float]:
    """
    Computes mass balance over the grid (all volumes in m^3 or depth equiv).
    """
    expected_final = initial_mass + cumulative_rainfall - cumulative_drainage - cumulative_boundary_outflow
    residual = final_mass - expected_final
    rel_error = abs(residual) / max(initial_mass, 1e-6)
    return {
        "initial_mass": initial_mass,
        "rainfall_mass": cumulative_rainfall,
        "drainage_mass": cumulative_drainage,
        "boundary_outflow": cumulative_boundary_outflow,
        "final_mass": final_mass,
        "residual": residual,
        "relative_error": rel_error
    }

def simulate(
    config: GridConfig,
    grid: TerrainGrid,
    rainfall_intensity_mm_hr: float,
    duration_minutes: float,
    dt_minutes: float,
    params: SimulationConfig = SimulationConfig()
) -> Dict[str, Any]:
    """
    Core numerical simulation engine for FlowShield.
    Converts strictly across numpy matrices for speed and robust localized stability.
    """
    # 1. Parameter Conversion
    duration_hr = duration_minutes / 60.0
    dt_hr = dt_minutes / 60.0
    P_m_hr = rainfall_intensity_mm_hr / 1000.0  # mm/hr to m/hr
    cell_size = config.cell_size_m
    
    steps = int(np.ceil(duration_minutes / dt_minutes))
    if steps == 0:
        steps = 1
    
    # Numerical Safety Check
    if (params.K_flow * dt_hr / cell_size) > 1.0:
        raise ValueError(f"dt_minutes={dt_minutes} is too large for stability. Max limit exceeded based on K_flow and cell_size.")
        
    H, W = config.height, config.width
    
    # State tracking initialized safely
    h = np.copy(grid.initial_water_depth)
    z = grid.elevation
    
    cum_drainage = 0.0
    cum_rainfall = 0.0
    cum_boundary_outflow = 0.0
    
    initial_vol = np.sum(h)
    
    time_to_critical = np.full((H, W), np.nan)
    time_to_warning = np.full((H, W), np.nan)
    peak_depth = np.copy(h)
    peak_time_hr = np.zeros((H, W))
    
    depth_frames = []
    risk_frames = []
    vx_frames = []
    vy_frames = []
    
    time_array = []
    current_time_hr = 0.0

    for step in range(steps):
        # 1. Rainfall
        h_rain = P_m_hr * grid.runoff_coefficient * dt_hr
        h += h_rain
        cum_rainfall += np.sum(h_rain)
        
        # 2. Drainage
        drainage_cap = grid.drainage_capacity * dt_hr
        drainage_cap[grid.blocked_drain_mask] = 0.0
        h_drain = np.minimum(h, drainage_cap)
        h -= h_drain
        cum_drainage += np.sum(h_drain)
        
        # 3. Flow Routing
        s = z + h
        
        # Pad with edge surface elevation to simulate open boundaries properly.
        # Boundary layer drops down to exact ground Z at the edge, forcing water h out across boundaries.
        s_padded = np.pad(s, pad_width=1, mode='edge')
        z_padded = np.pad(z, pad_width=1, mode='edge')
        
        # Boundary overlays explicitly mapping exact Z base values so zero relative barrier occurs.
        s_padded[0, 1:-1] = z[0, :]
        s_padded[-1, 1:-1] = z[-1, :]
        s_padded[1:-1, 0] = z[:, 0]
        s_padded[1:-1, -1] = z[:, -1]
        
        s_N = s_padded[0:-2, 1:-1]
        s_S = s_padded[2:, 1:-1]
        s_W = s_padded[1:-1, 0:-2]
        s_E = s_padded[1:-1, 2:]
        
        # 0-bounded gradients preventing anti-gravity backward flow
        g_N = np.maximum(s - s_N, 0) / cell_size
        g_S = np.maximum(s - s_S, 0) / cell_size
        g_W = np.maximum(s - s_W, 0) / cell_size
        g_E = np.maximum(s - s_E, 0) / cell_size
        
        # Calculate unrestricted optimal flow 
        q_N = params.K_flow * g_N * dt_hr
        q_S = params.K_flow * g_S * dt_hr
        q_W = params.K_flow * g_W * dt_hr
        q_E = params.K_flow * g_E * dt_hr
        
        q_out_total = q_N + q_S + q_W + q_E
        
        # Absolute stability limiter capping transfer explicitly against fraction of available cell water.
        max_allowable_out = h * params.max_transfer_rate
        
        scale = np.ones_like(h)
        overdraft = q_out_total > max_allowable_out
        scale[overdraft] = max_allowable_out[overdraft] / q_out_total[overdraft]
        
        act_N = q_N * scale
        act_S = q_S * scale
        act_W = q_W * scale
        act_E = q_E * scale
        
        # Deduct matrix
        outflow_sum = act_N + act_S + act_W + act_E
        h -= outflow_sum
        
        # Inflow matrix accumulation (Neighbor interactions)
        inflow = np.zeros_like(h)
        inflow[1:, :] += act_S[:-1, :]
        inflow[:-1, :] += act_N[1:, :]
        inflow[:, 1:] += act_E[:, :-1]
        inflow[:, :-1] += act_W[:, 1:]
        h += inflow
        
        # Eliminate water outside city bounds completely mimicking infinite drainage to void
        if hasattr(grid, 'valid_mask') and grid.valid_mask is not None:
            h[~grid.valid_mask] = 0.0
        
        # Integrate boundary tracking strictly for Mass Balance
        cum_boundary_outflow += np.sum(act_N[0, :])
        cum_boundary_outflow += np.sum(act_S[-1, :])
        cum_boundary_outflow += np.sum(act_W[:, 0])
        cum_boundary_outflow += np.sum(act_E[:, -1])
        
        # Save net directional vectors mathematically
        vx = act_E - act_W 
        vy = act_S - act_N 
        
        vx_frames.append(vx.copy())
        vy_frames.append(vy.copy())
        
        # 4. State & Risk Evaluation
        current_time_hr += dt_hr
        
        # Peak Depth Tracking
        is_new_peak = h > peak_depth
        peak_depth[is_new_peak] = h[is_new_peak]
        peak_time_hr[is_new_peak] = current_time_hr
        
        # Warning Tracking
        newly_warning = (h >= params.warning_threshold) & np.isnan(time_to_warning) & (~grid.lake_mask)
        time_to_warning[newly_warning] = current_time_hr
        
        # Only mutate newly critical indices keeping earliest TTC locked.
        newly_critical = (h >= params.critical_threshold) & np.isnan(time_to_critical) & (~grid.lake_mask)
        time_to_critical[newly_critical] = current_time_hr
        
        risk = np.full((H, W), RISK_SAFE)
        risk[(h >= params.safe_threshold) & (h < params.warning_threshold)] = RISK_WARNING
        risk[h >= params.critical_threshold] = RISK_CRITICAL
        risk[grid.lake_mask] = RISK_SAFE
        
        time_array.append(current_time_hr)
        depth_frames.append(h.copy())
        risk_frames.append(risk.copy())

    final_vol = np.sum(h)
    mb = calculate_mass_balance(
        initial_vol, cum_rainfall, cum_drainage, cum_boundary_outflow, final_vol
    )
    
    # Calculate magnitude across all frames (we can just compute mag per frame)
    v_mag_frames = [np.sqrt(vx_f**2 + vy_f**2) for vx_f, vy_f in zip(vx_frames, vy_frames)]
    
    return {
        "time_array": time_array,
        "depth_frames": depth_frames,
        "risk_frames": risk_frames,
        "flow_fields": {
            "vx": vx_frames,
            "vy": vy_frames,
            "magnitude": v_mag_frames
        },
        "time_to_critical": time_to_critical,
        "time_to_warning": time_to_warning,
        "peak_depth": peak_depth,
        "peak_time_hr": peak_time_hr,
        "mass_balance": mb,
        "summary_statistics": {
            "max_depth": float(np.max(h)),
            "mean_depth": float(np.mean(h)),
            "num_critical_cells": int(np.sum(risk_frames[-1] == RISK_CRITICAL))
        }
    }
