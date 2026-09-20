import os
import geopandas as gpd
import rasterio
from rasterio.features import rasterize

def rasterize_kml(kml_path, base_dem_path, out_tif_path, burn_value_col=None, default_burn_value=1):
    print(f"Rasterizing {os.path.basename(kml_path)}...")
    
    # 1. Load the vectors
    try:
        gdf = gpd.read_file(kml_path, engine='pyogrio')
    except Exception as e:
        print(f"Error reading KML {os.path.basename(kml_path)}: {e}")
        return
        
    print(f"Loaded {len(gdf)} features from vector.")
        
    # 2. Get base DEM attributes for exact raster alignments
    with rasterio.open(base_dem_path) as src:
        out_meta = src.meta.copy()
        out_shape = (src.height, src.width)
        transform = src.transform
        crs = src.crs

    # Align geometries to the exact CRS natively of the mapping layer
    if gdf.crs != crs:
        try:
            gdf = gdf.to_crs(crs)
        except Exception:
            # Fallback if no CRS defined
            gdf.set_crs(epsg=4326, inplace=True)
            gdf = gdf.to_crs(crs)

    # 3. Create the list of shapes to burn. 
    # If a column name is passed, we burn that value for each polygon, otherwise use default
    shapes = []
    
    # Check if this is LineStrings (drains) or Polygons (wards)
    for idx, row in gdf.iterrows():
        geom = row['geometry']
        if geom is None:
            continue
            
        value = default_burn_value
        if burn_value_col and burn_value_col in gdf.columns:
            try:
                # Wards might have text names, but we want an integer ID for fast masking.
                if isinstance(row[burn_value_col], (int, float)):
                    value = int(row[burn_value_col])
                else: 
                    # Use sequence index if column is fundamentally just strings
                    value = idx + 1
            except:
                value = idx + 1
        
        shapes.append((geom, value))
        
    if not shapes:
        print(f"Warning: No valid geometry bounds found in {kml_path}.")
        return

    # 4. Burn geometries statically into the Array limits
    image = rasterize(
        shapes,
        out_shape=out_shape,
        transform=transform,
        fill=0,
        all_touched=True,
        dtype='uint16' # Handle large ward sequence counts natively
    )

    out_meta.update({
        "driver": "GTiff",
        "dtype": "uint16",
        "nodata": 0,
        "count": 1
    })

    # 5. Output authentic masked images precisely
    with rasterio.open(out_tif_path, 'w', **out_meta) as dest:
        dest.write(image, 1)
        
    print(f"Saved raster matrix to {os.path.basename(out_tif_path)}.")

def run_pipeline():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    dem_path = os.path.join(base_dir, 'data/processed/bengaluru_dem.tif')
    
    # Paths to raw KML vectors
    kml_primary = os.path.join(base_dir, 'data/raw/kml/swd_primary.kml')
    kml_secondary = os.path.join(base_dir, 'data/raw/kml/swd_secondary.kml')
    kml_tertiary = os.path.join(base_dir, 'data/raw/kml/swd_tertiary.kml')
    kml_wards = os.path.join(base_dir, 'data/raw/kml/blr_wards.kml')
    
    # Process outputs
    out_primary = os.path.join(base_dir, 'data/processed/swd_primary_mask.tif')
    out_secondary = os.path.join(base_dir, 'data/processed/swd_secondary_mask.tif')
    out_tertiary = os.path.join(base_dir, 'data/processed/swd_tertiary_mask.tif')
    out_wards = os.path.join(base_dir, 'data/processed/blr_wards_mask.tif')

    print("--- STARTING HYBRID INGESTION ---")
    if os.path.exists(kml_primary):
        rasterize_kml(kml_primary, dem_path, out_primary, default_burn_value=1)
        
    if os.path.exists(kml_secondary):
        rasterize_kml(kml_secondary, dem_path, out_secondary, default_burn_value=1)
        
    if os.path.exists(kml_tertiary):
        rasterize_kml(kml_tertiary, dem_path, out_tertiary, default_burn_value=1)
        
    if os.path.exists(kml_wards):
        # Name is parsed natively by Name tag in KML
        rasterize_kml(kml_wards, dem_path, out_wards, burn_value_col='Name')

if __name__ == "__main__":
    run_pipeline()
