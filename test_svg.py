import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

# Fallback: check if SVG exists first
pattern = r"setResolvedSrc\(`\./portraits/\$\{talent\.portraitFile\}`\);"
replacement = "setResolvedSrc(`./portraits/${talent.portraitFile.replace('.webp', '.svg')}`);"

content = re.sub(pattern, replacement, content)

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
