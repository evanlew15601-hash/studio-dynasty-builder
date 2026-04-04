import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

# Fix the extremely aggressive and incorrect react set method
content = content.replace("setResolvedSrc(prev => prev === null ? null : null);", "setResolvedSrc(null);")

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
