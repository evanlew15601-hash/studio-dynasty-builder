import re

with open('src/game/systems/platformOriginalsReleaseCadenceSystem.ts', 'r') as f:
    content = f.read()

pattern = r'''      expectedAired = clampInt\(expectedAired, 0, active\.total\);

      const nextAired = active\.season\.episodesAired \?\? 0;'''

replacement = '''      expectedAired = clampInt(expectedAired, 0, active.total);

      const prevAired = clampInt(active.season.episodesAired ?? 0, 0, active.total);
      const nextAired = Math.max(prevAired, expectedAired);'''

content = re.sub(pattern, replacement, content)

with open('src/game/systems/platformOriginalsReleaseCadenceSystem.ts', 'w') as f:
    f.write(content)
