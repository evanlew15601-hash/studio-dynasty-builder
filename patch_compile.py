import re

with open('src/utils/onlineLeagueTurnCompile.ts', 'r') as f:
    content = f.read()

pattern = r'        franchiseTitle,\n      \};\n    \}\);'
replacement = '''        franchiseTitle,
        releaseFormat: p.releaseFormat,
        totalEpisodes: p.seasons?.[0]?.totalEpisodes ?? p.episodeCount,
        episodesAired: p.seasons?.[0]?.episodesAired,
      };
    });'''

content = re.sub(pattern, replacement, content)

with open('src/utils/onlineLeagueTurnCompile.ts', 'w') as f:
    f.write(content)
