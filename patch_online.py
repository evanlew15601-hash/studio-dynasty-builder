import re

with open('src/types/onlineLeague.ts', 'r') as f:
    content = f.read()

pattern = r'  franchiseTitle\?: string;\n\};'
replacement = '''  franchiseTitle?: string;
  releaseFormat?: string;
  totalEpisodes?: number;
  episodesAired?: number;
};'''

content = re.sub(pattern, replacement, content)

with open('src/types/onlineLeague.ts', 'w') as f:
    f.write(content)
