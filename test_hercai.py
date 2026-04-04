import urllib.request
import json
import os

prompt = "Daz Studio 3D render of a 52-year-old British White female actor. Head and shoulders portrait, front-facing, neutral but cold expression. Wearing sophisticated haute couture. Realistic skin texture, clean studio lighting. Plain flat grey background. Total Extreme Wrestling character portrait style, generic 3D character creator style."
encoded_prompt = urllib.parse.quote(prompt)

url = f"https://hercai.onrender.com/v3/text2image?prompt={encoded_prompt}"
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        image_url = data.get("url")
        if image_url:
            print(f"Got image URL: {image_url}")
            urllib.request.urlretrieve(image_url, "test-hercai.png")
            print("Downloaded!")
except Exception as e:
    print(f"Error: {e}")
