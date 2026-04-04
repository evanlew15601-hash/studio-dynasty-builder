import re

with open('src/data/WorldBible.ts', 'r') as f:
    content = f.read()

# Find all slugs
pattern = r"([ \t]+)slug: '([^']+)',\n([ \t]+)"

def replace_func(match):
    indent1 = match.group(1)
    slug = match.group(2)
    indent2 = match.group(3)
    
    # Check if the next line is already portraitFile
    # We can't easily do negative lookahead on the replacement, so let's just do a simpler script.
    return f"{indent1}slug: '{slug}',\n{indent1}portraitFile: '{slug}.webp',\n{indent2}"

# we will strip any existing portraitFiles first so we don't duplicate
content = re.sub(r"[ \t]+portraitFile: '[^']+',\n", "", content)

content = re.sub(pattern, replace_func, content)

with open('src/data/WorldBible.ts', 'w') as f:
    f.write(content)
