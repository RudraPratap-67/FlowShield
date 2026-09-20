import os
import numpy as np
from dataclasses import dataclass
from typing import Tuple, Optional
import scipy.ndimage

@dataclass
class GridConfig:
    """
    Configuration parameters for the simulation domain grid.
    
    Fields:
    - width: Number of cells in the X (longitude) direction.
    - height: Number of cells in the Y (latitude) direction.
    - latitude_min: Minimum latitude bound (bottom edge).
    - latitude_max: Maximum latitude bound (top edge).
    - longitude_min: Minimum longitude bound (left edge).
    - longitude_max: Maximum longitude bound (right edge).
    - cell_size_m: The spatial resolution of each square cell in metres.
    """
    width: int
    height: int
    latitude_min: float
    latitude_max: float
    longitude_min: float
    longitude_max: float
    cell_size_m: float


@dataclass
class TerrainGrid:
    """
    Core physical representation of the simulated area containing spatially-distributed 
    environmental and urban variables. All properties are continuous 2D NumPy arrays
    with dimensions matching (height, width).
    
    Fields:
    - elevation: (m) Topographical height of the cell. Governs gravity-driven water flow.
    - drainage_capacity: (m/hour) Peak rate at which water can be evacuated from surface via stormwater.
    - runoff_coefficient: [0, 1] Proportion of rainfall that becomes surface runoff (vs infiltrating).
    - initial_water_depth: (m) Standing surface water depth at the start of simulation.
    - lake_mask: (boolean) True if cell is part of an open water body (lake/pond). Used to adjust capacity.
    - blocked_drain_mask: (boolean) True if local drainage infra is severely compromised or clogged.
    - population: (count >= 0) Estimated human population count resident or present in the cell area.
    - valid_mask: (boolean) True if the cell is part of the active simulation compute domain (e.g., inside municipal boundary).
    """
    elevation: np.ndarray
    drainage_capacity: np.ndarray
    runoff_coefficient: np.ndarray
    initial_water_depth: np.ndarray
    lake_mask: np.ndarray
    blocked_drain_mask: np.ndarray
    population: np.ndarray
    valid_mask: np.ndarray
    ward_mask: Optional[np.ndarray] = None


def validate_grid(grid: TerrainGrid) -> None:
    """
    Validates physical constraints and structural integrity of the TerrainGrid object.
    Raises ValueError or TypeError if an invalid state is detected.
    """
    dim_ref = grid.elevation.shape
    if len(dim_ref) != 2:
        raise ValueError(f"Grid dimensions must be 2D, got {len(dim_ref)}D")
        
    components = {
        "drainage_capacity": grid.drainage_capacity,
        "runoff_coefficient": grid.runoff_coefficient,
        "initial_water_depth": grid.initial_water_depth,
        "lake_mask": grid.lake_mask,
        "blocked_drain_mask": grid.blocked_drain_mask,
        "population": grid.population,
        "valid_mask": grid.valid_mask,
    }
    if grid.ward_mask is not None:
        components["ward_mask"] = grid.ward_mask
    
    # Check shape match
    for name, arr in components.items():
        if arr.shape != dim_ref:
            raise ValueError(f"Shape mismatch: {name} has shape {arr.shape}, expected {dim_ref}")
            
    # Check nulls
    all_arrays = dict(components)
    all_arrays["elevation"] = grid.elevation
    for name, arr in all_arrays.items():
        if np.isnan(arr).any():
            raise ValueError(f"NaN values detected in {name}")
            
    if not np.isfinite(grid.elevation).all():
        raise ValueError("Elevation contains infinite values")
        
    # Check physics bounds
    if not ((grid.runoff_coefficient >= 0.0) & (grid.runoff_coefficient <= 1.0)).all():
        raise ValueError("Runoff coefficients must be within [0, 1]")
        
    if (grid.drainage_capacity < 0).any():
        raise ValueError("Drainage capacity must be non-negative")
        
    if (grid.population < 0).any():
        raise ValueError("Population must be non-negative")
        
    if (grid.initial_water_depth < 0).any():
        raise ValueError("Initial water depth must be non-negative")


def build_synthetic_city(width: int, height: int, seed: int = 42) -> Tuple[GridConfig, TerrainGrid]:
    """
    Generates a deterministic synthetic topography meant to test the physical flow model.
    It builds a landscape with a broad gradient, basins, noisy terrain, a drainage corridor,
    and a lake region. 
    
    NOTE: This is NOT real Bengaluru data.
    """
    np.random.seed(seed)
    
    # 1. Base Elevation: Broad gradient from Northwest (High) to Southeast (Low)
    x = np.linspace(0, 1, width)
    y = np.linspace(0, 1, height)
    xx, yy = np.meshgrid(x, y)
    
    # High in NW (xx=0, yy=0), Low in SE (xx=1, yy=1) mapping typical layout.
    # We'll use mm, say starting at 950m sloping down to 880m.
    elevation = 950.0 - 50.0 * (xx + yy)
    
    # 2. Mild spatial noise (high frequency)
    noise = np.random.normal(0, 1.5, size=(height, width))
    elevation += noise
    
    # Medium frequency hilly noise using sine waves 
    hills = 15.0 * np.sin(4.0 * np.pi * xx) * np.cos(3.0 * np.pi * yy)
    elevation += hills
    
    # 3. Create a primary drainage corridor (River/Valley)
    # Let's say a diagonal valley running through the middle.
    # Dist to diagonal: |x - y|
    dist_to_diag = np.abs(xx - yy)
    corridor_mask = dist_to_diag < 0.15
    # Carve out elevation
    elevation -= 20.0 * np.exp(-dist_to_diag * 15.0)
    
    # 4. Create several low-lying basin regions
    # Place 3 basins
    basins = [
        (0.3, 0.7, 0.08),  # (cx, cy, radius)
        (0.8, 0.4, 0.1),
        (0.5, 0.2, 0.05)
    ]
    for cx, cy, r in basins:
        dist = np.sqrt((xx - cx)**2 + (yy - cy)**2)
        basin_effect = np.where(dist < r, 12.0 * (1 - dist/r), 0)
        elevation -= basin_effect
        
    # 5. Determine lake mask based on the deepest basin
    lake_mask = np.zeros((height, width), dtype=bool)
    cx_lake, cy_lake, r_lake = basins[1]
    lake_dist = np.sqrt((xx - cx_lake)**2 + (yy - cy_lake)**2)
    lake_mask = lake_dist < (r_lake * 0.6) # core of the basin is a lake
    
    # Flatten the lake bottom so water pools nicely
    lake_elevation = np.median(elevation[lake_mask]) if lake_mask.any() else np.min(elevation)
    elevation = np.where(lake_mask, np.minimum(elevation, lake_elevation), elevation)
    
    # Generate Runoff Coefficients
    # Typical city: highly paved (0.8-0.95), parks (0.2-0.4)
    # We'll map higher runoff slightly towards the center (urban sprawl)
    dist_to_center = np.sqrt((xx - 0.5)**2 + (yy - 0.5)**2)
    runoff = 0.9 - 0.5 * np.clip(dist_to_center, 0, 1)
    # Add random noise to runoff
    runoff += np.random.normal(0, 0.05, size=(height, width))
    runoff = np.clip(runoff, 0.1, 0.95)
    # Lake is 100% runoff (no infiltration)
    runoff[lake_mask] = 1.0
    
    # Drainage Capacity (m/hour)
    # Let's assume standard capacity is 25mm/hr = 0.025m/hr
    # Less capacity in outskirts.
    drainage = 0.025 * np.ones((height, width))
    drainage[dist_to_center > 0.4] = 0.015 
    
    # Blocked Drain Mask
    # Randomly block some drains (e.g. 2% of non-lake cells are severely clogged)
    blocked_drain_mask = np.random.rand(height, width) < 0.02
    blocked_drain_mask[lake_mask] = False
    
    # Reduce capacity where blocked
    drainage[blocked_drain_mask] *= 0.1
    
    # Initial Water Depth
    # Dry start
    initial_water_depth = np.zeros((height, width))
    
    # Population counts
    # Concentrated in the NW and Center
    pop_density = 500 * np.exp(-3 * dist_to_center) # peak 500 per cell
    population = pop_density + np.random.normal(0, 20, size=(height, width))
    population = np.clip(np.round(population), 0, None)
    population[lake_mask] = 0
    
    valid_mask = np.ones((height, width), dtype=bool)
    
    grid = TerrainGrid(
        elevation=elevation,
        drainage_capacity=drainage,
        runoff_coefficient=runoff,
        initial_water_depth=initial_water_depth,
        lake_mask=lake_mask,
        blocked_drain_mask=blocked_drain_mask,
        population=population,
        valid_mask=valid_mask
    )
    
    config = GridConfig(
        width=width,
        height=height,
        latitude_min=12.8,
        latitude_max=13.1,
        longitude_min=77.5,
        longitude_max=77.8,
        cell_size_m=50.0
    )
    
    return config, grid


def build_city(city: Optional[str] = None, bbox: Optional[Tuple[float, float, float, float]] = None, sim_resolution: int = 100, seed: int = 42) -> Tuple[GridConfig, TerrainGrid]:
    """
    Main constructor for generating or loading urban terrain grids.
    If real DEM data for the specified city exists, it applies `scipy.ndimage.zoom` scaling it down 
    to `sim_resolution` limits, securing fast API runtimes.
    Falls back to synthetic generation if unavailable.
    """
    if city and city.lower() == "bengaluru":
        dem_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/processed/bengaluru_dem.tif'))
        if os.path.exists(dem_path):
            try:
                import rasterio
                
                with rasterio.open(dem_path) as src:
                    dem_data = src.read(1)
                    dem_data[dem_data < -1000] = 0.0 # Clear nodata holes
                    
                    bounds = src.bounds
                    orig_height, orig_width = dem_data.shape
                    
                    # Calculate scaling to make max dimension == sim_resolution
                    scale_factor = sim_resolution / max(orig_height, orig_width)
                    
                    # Resample natively 
                    elevation = scipy.ndimage.zoom(dem_data, scale_factor, order=1)
                    
                    # Derive synthetic infrastructure params mapped over real elevation
                    height, width = elevation.shape
                    np.random.seed(seed)
                    
                    # Generate identical mask generation as synth but applied to REAL geography
                    x = np.linspace(0, 1, width)
                    y = np.linspace(0, 1, height)
                    xx, yy = np.meshgrid(x, y)
                    dist_to_center = np.sqrt((xx - 0.5)**2 + (yy - 0.5)**2)
                    
                    runoff = 0.9 - 0.5 * np.clip(dist_to_center, 0, 1)
                    runoff += np.random.normal(0, 0.05, size=(height, width))
                    runoff = np.clip(runoff, 0.1, 0.95)
                    
                    # Lakes are natively recognized as perfectly flat extremely low regions
                    elev_min = np.min(elevation)
                    lake_mask = np.abs(elevation - elev_min) < 2.0
                    runoff[lake_mask] = 1.0
                    
                    drainage = 0.015 * np.ones((height, width))
                    
                    # --- Natively ingest mapping arrays if successfully rasterized ---
                    primary_mask_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/processed/swd_primary_mask.tif'))
                    if os.path.exists(primary_mask_path):
                        with rasterio.open(primary_mask_path) as p_src:
                            p_mask = p_src.read(1)
                            p_mask = scipy.ndimage.zoom(p_mask, scale_factor, order=0)
                            drainage[p_mask > 0] = 0.150 # Massive capacity for primary drains
                            
                    secondary_mask_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/processed/swd_secondary_mask.tif'))
                    if os.path.exists(secondary_mask_path):
                        with rasterio.open(secondary_mask_path) as s_src:
                            s_mask = s_src.read(1)
                            s_mask = scipy.ndimage.zoom(s_mask, scale_factor, order=0)
                            # Apply medium drain capacity cleanly filtering primaries out
                            drainage[(s_mask > 0) & ~(drainage > 0.1)] = 0.050
                            
                    ward_mask = None
                    wards_mask_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/processed/blr_wards_mask.tif'))
                    if os.path.exists(wards_mask_path):
                        with rasterio.open(wards_mask_path) as w_src:
                            w_mask = w_src.read(1)
                            ward_mask = scipy.ndimage.zoom(w_mask, scale_factor, order=0)
                            
                    drainage[dist_to_center > 0.4] = np.minimum(drainage[dist_to_center > 0.4], 0.010) 
                    
                    blocked_drain_mask = np.random.rand(height, width) < 0.02
                    blocked_drain_mask[lake_mask] = False
                    drainage[blocked_drain_mask] *= 0.1
                    
                    initial_water_depth = np.zeros((height, width))
                    
                    pop_density = 500 * np.exp(-3 * dist_to_center)
                    population = pop_density + np.random.normal(0, 20, size=(height, width))
                    population = np.clip(np.round(population), 0, None)
                    population[lake_mask] = 0
                    
                    valid_mask = elevation > 0 # Outside bounds crop will fall to ~0
                    
                    # Overwrite elevation strictly mapped to reality
                    grid = TerrainGrid(
                        elevation=elevation,
                        drainage_capacity=drainage,
                        runoff_coefficient=runoff,
                        initial_water_depth=initial_water_depth,
                        lake_mask=lake_mask,
                        blocked_drain_mask=blocked_drain_mask,
                        population=population,
                        valid_mask=valid_mask,
                        ward_mask=ward_mask
                    )
                    
                    config = GridConfig(
                        width=width,
                        height=height,
                        latitude_min=bounds.bottom,
                        latitude_max=bounds.top,
                        longitude_min=bounds.left,
                        longitude_max=bounds.right,
                        # Original cell size approx 30m. Scaled by 1/scale_factor
                        cell_size_m=30.0 / scale_factor
                    )
                    
                    print(f"Instantiated Real-Data City: {city} at {width}x{height} resolution!")
                    return config, grid
                    
            except Exception as e:
                print(f"WARNING: Failed to load real DEM for {city}: {e}. Falling back to synthetic.")
                
    # Fallback to pure synthetic
    return build_synthetic_city(sim_resolution, sim_resolution, seed)
