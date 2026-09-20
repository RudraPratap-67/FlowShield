import os
import geopandas as gpd

def kml_to_geojson():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    raw_dir = os.path.join(base_dir, 'data/raw/kml')
    
    # Target React's public folder for static file serving
    public_dir = os.path.join(base_dir, 'frontend/public/spatial')
    os.makedirs(public_dir, exist_ok=True)
    
    files_to_convert = {
        'swd_primary.kml': 'swd_primary.geojson',
        'swd_secondary.kml': 'swd_secondary.geojson',
        'blr_wards.kml': 'blr_wards.geojson'
    }
    
    for kml, geojson in files_to_convert.items():
        kml_path = os.path.join(raw_dir, kml)
        geo_path = os.path.join(public_dir, geojson)
        
        if os.path.exists(kml_path):
            print(f"Converting {kml} to {geojson}...")
            try:
                gdf = gpd.read_file(kml_path, engine='pyogrio')
                if gdf.crs is None:
                    gdf.set_crs(epsg=4326, inplace=True)
                # Save as GeoJSON
                gdf.to_file(geo_path, driver='GeoJSON')
                print(f"Successfully converted to {geo_path}")
            except Exception as e:
                print(f"Failed to convert {kml}: {e}")
        else:
            print(f"Skipping {kml}, not found.")

if __name__ == "__main__":
    kml_to_geojson()
