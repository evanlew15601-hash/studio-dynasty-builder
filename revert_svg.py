import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

# Revert from svg fallback to trying webp
pattern = r"setResolvedSrc\(`\./portraits/\$\{talent\.portraitFile\.replace\('\.webp', '\.svg'\)\}`\);"
replacement = r"setResolvedSrc(`/portraits/${talent.portraitFile}`);"

content = re.sub(pattern, replacement, content)

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
