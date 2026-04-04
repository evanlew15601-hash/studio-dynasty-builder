import urllib.request
import urllib.error
import urllib.parse
import json

url = "https://router.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
headers = {"Content-Type": "application/json"}
prompt = "Daz Studio 3D render of a 41-year-old Romanian male film director, plain flat grey background, head and shoulders portrait, front-facing, neutral expression. Wearing a casual dark jacket. Detailed skin texture, professional studio lighting. Total Extreme Wrestling character portrait style, generic character creator style."
data = json.dumps({"inputs": prompt}).encode('utf-8')

try:
    req = urllib.request.Request(url, data=data, headers=headers)
    response = urllib.request.urlopen(req)
    image_data = response.read()
    with open("public/portraits/test-mateo.png", "wb") as f:
        f.write(image_data)
    print("Success: Generated test-mateo.png")
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} - {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
