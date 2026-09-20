import os
import xml.etree.ElementTree as ET
import glob

def inspect_kml_files():
    base_dir = r"c:\Users\Razaid\Desktop\Coding Projects\Pentagram Hackathon\data"
    kml_files = glob.glob(os.path.join(base_dir, "*.kml"))
    
    for f in kml_files:
        print(f"\n--- {os.path.basename(f)} ---")
        try:
            # Parse only small part or use iterparse for large files
            size_mb = os.path.getsize(f) / (1024 * 1024)
            print(f"Size: {size_mb:.2f} MB")
            
            # Using iterparse to avoid loading the whole 27MB file into memory instantly
            context = ET.iterparse(f, events=('start',))
            count_placemark = 0
            first_names = []
            
            for event, elem in context:
                # Strip namespace: {http://www.opengis.net/kml/2.2}Placemark
                tag = elem.tag.split('}')[-1]
                if tag == "Document" or tag == "Folder":
                    for child in elem:
                        if child.tag.split('}')[-1] == "name":
                            print("Layer/Doc Name:", child.text)
                
                if tag == "Placemark":
                    count_placemark += 1
                    for child in elem:
                        if child.tag.split('}')[-1] == "name" and len(first_names) < 3:
                            first_names.append(child.text)
                    
                    # Clear element to free memory
                    elem.clear()
            
            print(f"Total Placemarks: {count_placemark}")
            print(f"Sample Placemark names: {first_names}")
            
        except Exception as e:
            print(f"Error parsing {os.path.basename(f)}: {e}")

if __name__ == "__main__":
    inspect_kml_files()
