import re

with open('src/game/systems/platformOriginalsReleaseCadenceSystem.ts', 'r') as f:
    content = f.read()

pattern = r'''        scheduledNextSeason \|\|
        nextAired !== nextAired \|\|
        airingStatus !== active\.season\.airingStatus \|\|'''

replacement = '''        scheduledNextSeason ||
        nextAired !== prevAired ||
        airingStatus !== active.season.airingStatus ||'''

content = re.sub(pattern, replacement, content)

with open('src/game/systems/platformOriginalsReleaseCadenceSystem.ts', 'w') as f:
    f.write(content)
