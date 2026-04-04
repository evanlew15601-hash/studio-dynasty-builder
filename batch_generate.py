import urllib.request
import urllib.parse
import os
import json
import time

def parse_bible():
    characters = []
    
    with open('src/data/WorldBible.ts', 'r') as f:
        content = f.read()
        
    import re
    # Match the main blocks
    pattern = r"slug:\s*'([^']+)',\s*portraitFile:\s*'[^']+',\s*tier:\s*'[^']+',\s*name:\s*'([^']+)',\s*type:\s*'([^']+)',\s*gender:\s*'([^']+)',\s*(?:nationality:\s*'([^']+)',\s*)?(?:race:\s*'([^']+)',\s*)?birthYear:\s*(\d+)"
    
    for match in re.finditer(pattern, content):
        characters.append({
            'slug': match.group(1),
            'name': match.group(2),
            'type': match.group(3),
            'gender': match.group(4),
            'nationality': match.group(5) or 'Unknown',
            'race': match.group(6) or 'Unknown',
            'age': 2026 - int(match.group(7))
        })
        
    return characters

def generate_portrait(char):
    # Construct the Daz 3D TEW prompt
    prompt = f"Daz Studio 3D render of a {char['age']}-year-old {char['nationality']} {char['race']} {char['gender'].lower()} film {char['type']}, plain flat grey background, head and shoulders portrait, front-facing, neutral expression. Detailed skin texture, professional studio lighting. Total Extreme Wrestling character portrait style, generic character creator style."
    
    encoded_prompt = urllib.parse.quote(prompt)
    # Using WebP format directly for smaller bundle size
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=256&height=256&nologo=true"
    
    filepath = f"public/portraits/{char['slug']}.webp"
    
    # Skip if already exists
    if os.path.exists(filepath):
        return True
        
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            image_data = response.read()
            with open(filepath, "wb") as f:
                f.write(image_data)
        print(f"Generated: {char['slug']}")
        time.sleep(0.5) # Rate limiting
        return True
    except Exception as e:
        print(f"Failed {char['slug']}: {e}")
        return False

def main():
    chars = parse_bible()
    print(f"Found {len(chars)} core characters to generate.")
    
    for char in chars:
        generate_portrait(char)

if __name__ == "__main__":
    main()
