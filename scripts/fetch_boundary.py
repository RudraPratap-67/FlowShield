import os
import requests
import json

def fetch_boundary():
    # Relation 3268297 is Bruhat Bengaluru Mahanagara Palike (BBMP)
    query = """
    [out:json];
    relation(3268297);
    out geom;
    """
    
    url = "https://overpass-api.de/api/interpreter"
    print("Querying Overpass API for BBMP boundary (id 3268297)...")
    response = requests.get(url, params={'data': query})
    
    if response.status_code != 200:
        print("Error fetching from Overpass", response.status_code)
        print(response.text)
        return
        
    data = response.json()
    elements = data.get("elements", [])
    
    if not elements:
        print("No boundary found.")
        return
        
    best_el = elements[0]
    
    # Calculate approx area and bbox
    bounds = best_el.get("bounds", {})
    print(f"Boundary Found: {best_el.get('tags', {}).get('name')}")
    print(f"Bounding Box: {bounds}")
        
    # Convert to GeoJSON roughly
    coordinates = []
    current_ring = []
    
    for member in best_el.get("members", []):
        if member["type"] == "way" and member["role"] == "outer":
            poly = []
            for node in member.get("geometry", []):
                poly.append([node["lon"], node["lat"]])
            if poly:
                coordinates.append(poly)
    
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "source": "OpenStreetMap via Overpass API",
                    "source_url": "https://overpass-api.de/api/interpreter",
                    "boundary_type": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
                    "name": best_el.get("tags", {}).get("name"),
                    "bbox": [bounds.get('minlon'), bounds.get('minlat'), bounds.get('maxlon'), bounds.get('maxlat')]
                },
                "geometry": {
                    "type": "MultiLineString", # Simplification since sorting outer ways perfectly into a polygon requires shapely
                    "coordinates": coordinates
                }
            }
        ]
    }
    
    out_dir = os.path.join(os.path.dirname(__file__), '../data/raw/bengaluru')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'bengaluru_boundary.geojson')
    with open(out_path, 'w') as f:
        json.dump(geojson, f, indent=2)
        
    print(f"Saved to {out_path}")

if __name__ == "__main__":
    fetch_boundary()
