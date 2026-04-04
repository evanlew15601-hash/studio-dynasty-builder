import re

with open('src/data/WorldBible.ts', 'r') as f:
    content = f.read()

content = content.replace("  slug: string;", "  slug: string;\n  portraitFile?: string;")

pattern = r'''(  \{\n    slug: '([^']+)',)'''

def replace_func(match):
    full_match = match.group(1)
    slug = match.group(2)
    return f"{full_match}\n    portraitFile: '{slug}.webp',"

content = re.sub(pattern, replace_func, content)

with open('src/data/WorldBible.ts', 'w') as f:
    f.write(content)
