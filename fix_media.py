import re

with open('src/game/media/mediaReputationIntegration.ts', 'r') as f:
    content = f.read()

content = content.replace("MAX_MARKET_VALUE = 500_000_000", "MAX_MARKET_VALUE = 35_000_000")
content = content.replace("max $500M", "max $35M")

with open('src/game/media/mediaReputationIntegration.ts', 'w') as f:
    f.write(content)
