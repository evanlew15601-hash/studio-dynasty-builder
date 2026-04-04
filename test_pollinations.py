import urllib.request
import urllib.parse
import os

prompt = "Daz Studio 3D render of a 41-year-old Romanian male film director, plain flat grey background, head and shoulders portrait, front-facing, neutral expression. Wearing a casual dark jacket. Detailed skin texture, professional studio lighting. Total Extreme Wrestling character portrait style, generic character creator style."
encoded_prompt = urllib.parse.quote(prompt)
url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=256&height=256&nologo=true"

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        image_data = response.read()
        with open("public/portraits/test-mateo.jpg", "wb") as f:
            f.write(image_data)
    print("Success! Image downloaded.")
except Exception as e:
    print(f"Error: {e}")
