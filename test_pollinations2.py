import urllib.request
import time
try:
    req = urllib.request.Request("https://image.pollinations.ai/prompt/test?width=256&height=256&nologo=true&seed=999", headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req)
    print(f"Status: {response.status}")
except Exception as e:
    print(f"Error: {e}")
