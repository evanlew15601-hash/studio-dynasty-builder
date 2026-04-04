import csv
import urllib.request
import urllib.parse
import os
import time

def download_all():
    if not os.path.exists("public/portraits"):
        os.makedirs("public/portraits")
        
    tasks = []
    with open("portrait_prompts.csv", "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) == 2:
                tasks.append((row[0], row[1]))
                
    print(f"Starting extremely slow background generation for {len(tasks)} images...")
    
    for slug, prompt in tasks:
        filepath = f"public/portraits/{slug}.webp"
        if os.path.exists(filepath):
            continue
            
        encoded = urllib.parse.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded}?width=256&height=256&nologo=true"
        
        success = False
        while not success:
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=30) as response:
                    if response.status == 200:
                        with open(filepath, 'wb') as out:
                            out.write(response.read())
                        print(f"[{time.strftime('%X')}] ✓ {slug}")
                        success = True
                        time.sleep(15) # Wait 15 seconds after a success
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    print(f"[{time.strftime('%X')}] Rate limited. Resting for 60 seconds...")
                    time.sleep(60)
                else:
                    print(f"[{time.strftime('%X')}] HTTP {e.code} on {slug}. Waiting 30s...")
                    time.sleep(30)
            except Exception as e:
                print(f"[{time.strftime('%X')}] Error on {slug}: {e}. Waiting 30s...")
                time.sleep(30)
                
    print("All 197 portraits downloaded!")

if __name__ == "__main__":
    download_all()
