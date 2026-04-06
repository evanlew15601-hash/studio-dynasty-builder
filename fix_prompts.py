import csv
import re

with open('portrait_prompts.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

with open('portrait_prompts.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    for row in rows:
        slug = row[0]
        old_prompt = row[1]
        
        # Replace the overly specific constraints that confuse Gemini
        new_prompt = old_prompt.replace("Total Extreme Wrestling character portrait style, generic character creator style.", "")
        new_prompt = new_prompt.replace("Daz Studio 3D render", "A high-quality, professional 3D video game character render")
        
        # Make it explicitly focused on a single person to prevent collages
        new_prompt = new_prompt.replace("head and shoulders portrait", "close-up head and shoulders portrait of ONE single person")
        new_prompt = new_prompt + " Clean, stylized 3D video game character art. Solid dark grey background."
        
        writer.writerow([slug, new_prompt])
