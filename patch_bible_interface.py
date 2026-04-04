import re

with open('src/data/WorldBible.ts', 'r') as f:
    content = f.read()

content = content.replace("  slug: string;\n  tier:", "  slug: string;\n  portraitFile?: string;\n  tier:")

with open('src/data/WorldBible.ts', 'w') as f:
    f.write(content)
