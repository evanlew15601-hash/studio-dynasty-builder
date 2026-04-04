import re

with open('src/game/systems/talentCareerArcSystem.ts', 'r') as f:
    content = f.read()

content = content.replace("const MAX_MARKET_VALUE = 250_000_000;", "const MAX_MARKET_VALUE = 35_000_000;")
content = content.replace("Math.round((t.marketValue || 5000000) * 0.15)", "Math.round((t.marketValue || 5000000) * 0.08)")
content = content.replace("Math.round((t.marketValue || 5000000) * 0.10)", "Math.round((t.marketValue || 5000000) * 0.05)")
content = content.replace("-Math.round((t.marketValue || 5000000) * 0.10)", "-Math.round((t.marketValue || 5000000) * 0.05)")

with open('src/game/systems/talentCareerArcSystem.ts', 'w') as f:
    f.write(content)
