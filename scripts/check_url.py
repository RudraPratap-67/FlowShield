import requests
import re

url = "https://data.worldpop.org/GIS/Population/Global_2000_2020_1km/2020/IND/"
r = requests.get(url)
print("Files in 1km Directory:")
for match in re.findall(r'href=["\']([^"\']+\.tif)["\']', r.text):
    print("Found:", match)
