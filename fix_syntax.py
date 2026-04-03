import re

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'r') as f:
    content = f.read()

content = content.replace(r"{originalType === \'series\' && (<>", "{originalType === 'series' && (<>")

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'w') as f:
    f.write(content)
