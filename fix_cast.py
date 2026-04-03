import re

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'r') as f:
    content = f.read()

# Replace crew: [] with cast: [], crew: []
content = content.replace("      crew: [],", "      cast: [],\n      crew: [],")

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'w') as f:
    f.write(content)
