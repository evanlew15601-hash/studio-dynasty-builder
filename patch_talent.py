import re

with open('src/types/game.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "  name: string;",
    "  name: string;\n  portraitFile?: string;"
)

with open('src/types/game.ts', 'w') as f:
    f.write(content)
