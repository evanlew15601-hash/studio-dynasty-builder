import urllib.request
import urllib.parse

prompt = "Daz Studio 3D render of a 41-year-old Romanian male film director, plain flat grey background, head and shoulders portrait, front-facing, neutral expression. Wearing a casual dark jacket. Detailed skin texture, professional studio lighting. Total Extreme Wrestling character portrait style, generic character creator style."
encoded = urllib.parse.quote(prompt)
url = f"https://image.pollinations.ai/prompt/{encoded}?width=256&height=256&nologo=true"

try:
    print(f"Requesting {url}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as response:
        print(f"Status: {response.status}")
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} - {e.read().decode('utf-8', errors='ignore')}")
except Exception as e:
    print(f"Error: {e}")
