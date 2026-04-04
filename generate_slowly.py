import csv
import urllib.request
import urllib.parse
import os
import time
import sys

if not os.path.exists('public/portraits'):
    os.makedirs('public/portraits')

with open('portrait_prompts.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader) # skip header
    tasks = list(reader)

print(f"Starting slow generation for {len(tasks)} portraits...")
sys.stdout.flush()

for slug, prompt in tasks:
    filepath = f"public/portraits/{slug}.webp"
    if os.path.exists(filepath):
        continue
        
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=256&height=256&nologo=true"
    
    success = False
    retries = 10
    while not success and retries > 0:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=45) as response:
                with open(filepath, 'wb') as out:
                    out.write(response.read())
            print(f"[{time.strftime('%X')}] ✓ Generated {slug}")
            sys.stdout.flush()
            success = True
            time.sleep(12) # 12 second delay between successful requests
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"[{time.strftime('%X')}] Rate limited on {slug}. Waiting 45s...")
                sys.stdout.flush()
                time.sleep(45)
                retries -= 1
            else:
                print(f"[{time.strftime('%X')}] HTTP Error {e.code} on {slug}. Waiting 20s...")
                sys.stdout.flush()
                time.sleep(20)
                retries -= 1
        except Exception as e:
            print(f"[{time.strftime('%X')}] Error on {slug}: {e}. Waiting 20s...")
            sys.stdout.flush()
            time.sleep(20)
            retries -= 1
print("Done!")
