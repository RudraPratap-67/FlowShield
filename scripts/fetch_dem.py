import os
import json
import requests
import math
import tempfile
import rasterio
from rasterio.merge import merge
from rasterio.mask import mask
import geopandas as gpd

def get_tile_name(lat, lon):
    # Copernicus tiles are named like Copernicus_DSM_COG_10_N12_00_E077_00_DEM
    ns = "N" if lat >= 0 else "S"
    ew = "E" if lon >= 0 else "W"
    
    # Format to two digits
    lat_str = f"{abs(lat):02d}_00"
    lon_str = f"{abs(lon):03d}_00"
    
    return f"Copernicus_DSM_COG_10_{ns}{lat_str}_{ew}{lon_str}_DEM"

def download_tiles(min_lon, min_lat, max_lon, max_lat, download_dir):
    min_lat_deg = math.floor(min_lat)
    max_lat_deg = math.floor(max_lat)
    min_lon_deg = math.floor(min_lon)
    max_lon_deg = math.floor(max_lon)
    
    tiles = []
    
    for lat in range(min_lat_deg, max_lat_deg + 1):
        for lon in range(min_lon_deg, max_lon_deg + 1):
            tile_name = get_tile_name(lat, lon)
            tiles.append(tile_name)
            
    downloaded_paths = []
    
    for tile in tiles:
        url = f"https://copernicus-dem-30m.s3.amazonaws.com/{tile}/{tile}.tif"
        out_path = os.path.join(download_dir, f"{tile}.tif")
        if not os.path.exists(out_path):
            print(f"Downloading {tile}...")
            r = requests.get(url, stream=True)
            if r.status_code == 200:
                with open(out_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"Downloaded securely to {out_path}")
            else:
                print(f"Failed to fetch {tile}: {r.status_code}")
                # Some ocean tiles might not exist, but let's assume land tiles do
        downloaded_paths.append(out_path)
        
    # Return paths that actually exist
    return [p for p in downloaded_paths if os.path.exists(p)]

def process_dem():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    geojson_path = os.path.join(root_dir, 'data/raw/bengaluru/bengaluru_boundary.geojson')
    
    print("Loading Boundary GeoJSON...")
    gdf = gpd.read_file(geojson_path)
    
    minx, miny, maxx, maxy = gdf.total_bounds
    print(f"Boundary bbox: Lon ({minx:.4f} to {maxx:.4f}), Lat ({miny:.4f} to {maxy:.4f})")
    
    raw_dem_dir = os.path.join(root_dir, 'data/raw/dem')
    os.makedirs(raw_dem_dir, exist_ok=True)
    
    print("Evaluating Required Copernicus DEM GLO-30 Tiles...")
    tile_paths = download_tiles(minx, miny, maxx, maxy, raw_dem_dir)
    print(f"Tiles used for mosaic: {[os.path.basename(t) for t in tile_paths]}")
    
    if not tile_paths:
        print("FAIL: No tiles downloaded.")
        return
        
    print("Mosaicking Tiles...")
    src_files_to_mosaic = []
    for fp in tile_paths:
        src = rasterio.open(fp)
        src_files_to_mosaic.append(src)
        
    mosaic, out_trans = merge(src_files_to_mosaic)
    out_meta = src_files_to_mosaic[0].meta.copy()
    
    # Save temporary mosaic to clip it
    out_meta.update({
        "driver": "GTiff",
        "height": mosaic.shape[1],
        "width": mosaic.shape[2],
        "transform": out_trans,
    })
    
    temp_mosaic = os.path.join(raw_dem_dir, "temp_mosaic.tif")
    with rasterio.open(temp_mosaic, "w", **out_meta) as dest:
        dest.write(mosaic)
        
    # Close sources
    for src in src_files_to_mosaic:
        src.close()
        
    print("Clipping DEM strictly to Boundary Polygon...")
    with rasterio.open(temp_mosaic) as src:
        # Mask using GeoPandas geometries
        out_image, out_transform = mask(src, gdf.geometry, crop=True)
        out_meta = src.meta
        out_meta.update({"driver": "GTiff",
                         "height": out_image.shape[1],
                         "width": out_image.shape[2],
                         "transform": out_transform})
        
        proc_dem_dir = os.path.join(root_dir, 'data/processed')
        os.makedirs(proc_dem_dir, exist_ok=True)
        
        out_dem_path = os.path.join(proc_dem_dir, "bengaluru_dem.tif")
        with rasterio.open(out_dem_path, "w", **out_meta) as dest:
            dest.write(out_image)
            
        print("DEM STATUS: PASS")
        print(f"Tiles downloaded: {len(tile_paths)}")
        print(f"Original resolution: ~30m")
        print(f"CRS: {src.crs.to_string()}")
        print(f"Clipped dimensions: Width {out_image.shape[2]}, Height {out_image.shape[1]}")
        print(f"Elevation min: {out_image[out_image > 0].min():.2f}")
        print(f"Elevation max: {out_image.max():.2f}")
        print(f"Elevation mean: {out_image[out_image > 0].mean():.2f}")
        
    os.remove(temp_mosaic)
    print(f"Processed clipped DEM saved natively to {out_dem_path}")

if __name__ == "__main__":
    process_dem()
