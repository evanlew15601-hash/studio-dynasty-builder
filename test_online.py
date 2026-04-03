import re

with open('src/utils/onlineLeagueTurnCompile.ts', 'r') as f:
    content = f.read()

pattern = r'export function createOnlineLeagueTurnBaseline\(state: GameState\): OnlineLeagueTurnBaseline \{'
replacement = '''export function createOnlineLeagueTurnBaseline(state: GameState): OnlineLeagueTurnBaseline {
  if (!state) return { contractedKeys: new Set<string>() };'''

content = re.sub(pattern, replacement, content)

with open('src/utils/onlineLeagueTurnCompile.ts', 'w') as f:
    f.write(content)
