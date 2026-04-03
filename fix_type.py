import re
with open('src/components/game/StreamingWarsPlatformApp.tsx', 'r') as f:
    lines = f.readlines()

lines[1466] = lines[1466].replace("type: originalType === 'film' ? 'film' : 'series',", "type: originalType === 'film' ? 'feature' : 'series',")

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'w') as f:
    f.writelines(lines)
