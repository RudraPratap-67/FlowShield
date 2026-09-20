import os
import requests
import json

def get_bengaluru_boundary():
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": "Bengaluru",
        "format": "geojson",
        "polygon_geojson": 1,
        "limit": 5
    }
    headers = {
        "User-Agent": "FlowShield/1.0"
    }
    
    print("Querying Nominatim...")
    r = requests.get(url, params=params, headers=headers)
    
    if r.status_code != 200:
        print("Error:", r.status_code)
        return
        
    data = r.json()
    features = data.get("features", [])
    
    boundary_feature = None
    for f in features:
        props = f.get("properties", {})
        if props.get("category") == "boundary" and props.get("type") == "administrative":
            # Prefer BBMP (city proper) or Bengaluru Urban district
            if "Urban" not in props.get("display_name", ""):
                boundary_feature = f
                break
                
    if not boundary_feature:
        # Fallback to whatever administrative boundary came first
        for f in features:
            props = f.get("properties", {})
            if props.get("category") == "boundary" and props.get("type") == "administrative":
                boundary_feature = f
                break
                
    if not boundary_feature:
        print("Could not find boundary.")
        return
        
    props = boundary_feature["properties"]
    print("Found Boundary:", props.get("display_name"))
    print("Type:", props.get("type"))
    
    # Calculate approx bbox from geom
    geom = boundary_feature.get("geometry")
    
    # We will just save this exact GeoJSON FeatureCollection
    output = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "source": "OpenStreetMap via Nominatim",
                    "source_url": "https://nominatim.openstreetmap.org/",
                    "boundary_type": "administrative",
                    "name": props.get("display_name"),
                    "place_id": props.get("place_id"),
                    "osm_id": props.get("osm_id")
                },
                "geometry": geom
            }
        ]
    }
    
    out_dir = os.path.join(os.path.dirname(__file__), '../data/raw/bengaluru')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'bengaluru_boundary.geojson')
    
    with open(out_path, 'w') as f:
        json.dump(output, f)
        
    print(f"Saved to {out_path}")

if __name__ == "__main__":
    get_bengaluru_boundary()
